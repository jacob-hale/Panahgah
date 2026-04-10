using Panahgah.Api.Contracts;
using SixLabors.ImageSharp;
using SixLabors.ImageSharp.Formats.Jpeg;
using SixLabors.ImageSharp.Formats.Png;
using SixLabors.ImageSharp.PixelFormats;
using SixLabors.ImageSharp.Processing;

namespace Panahgah.Api.Services;

public interface IMediaAssetSelector
{
    Task<SelectedMediaAsset?> SelectAsync(string category, string platform, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<string>> ListCategoriesAsync(CancellationToken cancellationToken = default);
    Task<string?> PickRandomCategoryAsync(CancellationToken cancellationToken = default);
    Task<CampaignMediaUploadResponseDto> UploadCampaignImageAsync(
        string category,
        Stream fileStream,
        string originalFileName,
        CancellationToken cancellationToken = default);
}

public sealed class SelectedMediaAsset
{
    public string category { get; init; } = string.Empty;
    public string url { get; init; } = string.Empty;
    public string? alt_text { get; init; }
    public string? tags { get; init; }
}

public sealed class MediaAssetSelector(IWebHostEnvironment environment, IConfiguration configuration) : IMediaAssetSelector
{
    private static readonly Random Random = new();

    // Keep campaign assets to formats Meta reliably accepts for both Facebook photos and Instagram images.
    private static readonly string[] ImageExtensions = [".png", ".jpg", ".jpeg", ".webp"];

    private static readonly string[] AllowedUploadExtensions = [".png", ".jpg", ".jpeg", ".webp"];

    private const int MaxDimension = 2048;
    private const int MinDimension = 64;
    private const long MaxUploadBytes = 5L * 1024 * 1024;
    private const long MaxSavedFileBytes = 2L * 1024 * 1024;

    /// <summary>
    /// When the API runs in Docker / cloud, there is often no checkout of <c>frontend/public</c>.
    /// Public URLs still point at the deployed static host; this table must stay aligned with that tree.
    /// </summary>
    private static readonly Dictionary<string, string[]> FallbackCampaignFilesByCategory = new(StringComparer.OrdinalIgnoreCase)
    {
        ["donation_impact"] = ["donations_reliefItems.png", "donations_schoolSupplies.png"],
        ["events"] = ["events_commuityOutreach.png", "event_awarenessWorkshop.png"],
        ["girls"] = ["girls_withSocialWorker.png", "girl_studyAtDesk.png"],
        ["motivational_quotes"] = ["motivational_quote_plantGrowing.png", "motivational_quote_sunrise.png"],
        ["safehouses"] = ["safehouse_cleanBedroom.png", "safehouse_cleanSanctuary.png"],
    };

    public Task<IReadOnlyList<string>> ListCategoriesAsync(CancellationToken cancellationToken = default)
    {
        var root = ResolveMediaRootPath();
        if (Directory.Exists(root))
        {
            var categories = Directory.GetDirectories(root)
                .Select(Path.GetFileName)
                .Where(x => !string.IsNullOrWhiteSpace(x))
                .Select(x => x!)
                .OrderBy(x => x)
                .ToList();
            if (categories.Count > 0)
            {
                return Task.FromResult<IReadOnlyList<string>>(categories);
            }
        }

        return Task.FromResult<IReadOnlyList<string>>(FallbackCampaignFilesByCategory.Keys.OrderBy(k => k).ToList());
    }

    public async Task<string?> PickRandomCategoryAsync(CancellationToken cancellationToken = default)
    {
        var categories = await ListCategoriesAsync(cancellationToken);
        if (categories.Count == 0)
        {
            return null;
        }

        return categories[Random.Next(categories.Count)];
    }

    public Task<SelectedMediaAsset?> SelectAsync(string category, string platform, CancellationToken cancellationToken = default)
    {
        var normalizedCategory = category.Trim().ToLowerInvariant();
        if (string.IsNullOrWhiteSpace(normalizedCategory))
        {
            return Task.FromResult<SelectedMediaAsset?>(null);
        }

        var root = ResolveMediaRootPath();
        if (Directory.Exists(root))
        {
            var categoryFolder = Directory.GetDirectories(root)
                .FirstOrDefault(d =>
                    string.Equals(Path.GetFileName(d), normalizedCategory, StringComparison.OrdinalIgnoreCase))
                ?? Path.Combine(root, normalizedCategory);
            if (Directory.Exists(categoryFolder))
            {
                var files = Directory.GetFiles(categoryFolder)
                    .Where(path => ImageExtensions.Contains(Path.GetExtension(path).ToLowerInvariant()))
                    .ToList();
                if (files.Count > 0)
                {
                    var selectedFile = files[Random.Next(files.Count)];
                    var fileName = Path.GetFileName(selectedFile);
                    var realCategory = Path.GetFileName(categoryFolder) ?? normalizedCategory;
                    return Task.FromResult<SelectedMediaAsset?>(BuildSelectedAsset(realCategory, fileName));
                }
            }
        }

        if (TrySelectFallback(normalizedCategory, out var fallback))
        {
            return Task.FromResult<SelectedMediaAsset?>(fallback);
        }

        return Task.FromResult<SelectedMediaAsset?>(null);
    }

    public async Task<CampaignMediaUploadResponseDto> UploadCampaignImageAsync(
        string category,
        Stream fileStream,
        string originalFileName,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(category))
        {
            throw new InvalidOperationException("Category is required.");
        }

        if (fileStream is null || !fileStream.CanRead)
        {
            throw new InvalidOperationException("A readable file stream is required.");
        }

        var categories = await ListCategoriesAsync(cancellationToken);
        var match = categories.FirstOrDefault(c => string.Equals(c.Trim(), category.Trim(), StringComparison.OrdinalIgnoreCase));
        if (match is null)
        {
            throw new InvalidOperationException("Unknown image category.");
        }

        var ext = Path.GetExtension(originalFileName ?? string.Empty).ToLowerInvariant();
        if (string.IsNullOrEmpty(ext) || !AllowedUploadExtensions.Contains(ext))
        {
            throw new InvalidOperationException("Use a PNG, JPEG, or WebP file.");
        }

        if (fileStream.CanSeek && fileStream.Length > MaxUploadBytes)
        {
            throw new InvalidOperationException("File must be 5 MB or smaller before processing.");
        }

        await using var buffer = new MemoryStream();
        await fileStream.CopyToAsync(buffer, cancellationToken);
        if (buffer.Length > MaxUploadBytes)
        {
            throw new InvalidOperationException("File must be 5 MB or smaller before processing.");
        }

        buffer.Position = 0;

        using var image = await Image.LoadAsync(buffer, cancellationToken);
        image.Mutate(x => x.AutoOrient());

        if (image.Width > MaxDimension || image.Height > MaxDimension)
        {
            image.Mutate(x => x.Resize(new ResizeOptions
            {
                Mode = ResizeMode.Max,
                Size = new Size(MaxDimension, MaxDimension),
            }));
        }

        if (image.Width < MinDimension || image.Height < MinDimension)
        {
            throw new InvalidOperationException(
                $"Image must be at least {MinDimension}×{MinDimension} pixels after processing (current {image.Width}×{image.Height}).");
        }

        var root = ResolveMediaRootPath();
        Directory.CreateDirectory(root);
        var categoryDir = Path.Combine(root, match);
        Directory.CreateDirectory(categoryDir);

        var baseName = $"upload_{DateTime.UtcNow:yyyyMMddHHmmss}_{Guid.NewGuid():N}";
        var hasTransparency = HasTransparency(image, cancellationToken);

        string fullPath;
        string format;

        if (hasTransparency)
        {
            var pngPath = Path.Combine(categoryDir, $"{baseName}.png");
            await SaveAsPngCompressedAsync(image, pngPath, cancellationToken);
            if (new FileInfo(pngPath).Length <= MaxSavedFileBytes)
            {
                fullPath = pngPath;
                format = "png";
            }
            else
            {
                File.Delete(pngPath);
                fullPath = Path.Combine(categoryDir, $"{baseName}.jpg");
                await SaveAsJpegFlattenedAsync(image, fullPath, 88, cancellationToken);
                format = "jpeg";
                await EnsureUnderSizeLimitAsync(image, fullPath, cancellationToken);
            }
        }
        else
        {
            fullPath = Path.Combine(categoryDir, $"{baseName}.jpg");
            await SaveAsJpegFlattenedAsync(image, fullPath, 88, cancellationToken);
            format = "jpeg";
            await EnsureUnderSizeLimitAsync(image, fullPath, cancellationToken);
        }

        var fi = new FileInfo(fullPath);
        using var finalMeta = await Image.LoadAsync(fullPath, cancellationToken);
        var fileName = Path.GetFileName(fullPath);
        var publicUrl = $"{ResolveMediaPublicBaseUrl().TrimEnd('/')}/{match}/{Uri.EscapeDataString(fileName)}";

        return new CampaignMediaUploadResponseDto
        {
            category = match,
            file_name = fileName,
            public_url = publicUrl,
            width = finalMeta.Width,
            height = finalMeta.Height,
            size_bytes = fi.Length,
            format = format,
        };
    }

    private static bool HasTransparency(Image image, CancellationToken cancellationToken)
    {
        using var rgba = image.CloneAs<Rgba32>();
        var found = false;
        rgba.ProcessPixelRows(accessor =>
        {
            for (var y = 0; y < accessor.Height && !found; y++)
            {
                cancellationToken.ThrowIfCancellationRequested();
                var row = accessor.GetRowSpan(y);
                for (var x = 0; x < row.Length; x++)
                {
                    if (row[x].A < byte.MaxValue)
                    {
                        found = true;
                        return;
                    }
                }
            }
        });
        return found;
    }

    private static async Task SaveAsPngCompressedAsync(Image image, string fullPath, CancellationToken cancellationToken)
    {
        var encoder = new PngEncoder { CompressionLevel = PngCompressionLevel.BestCompression };
        await image.SaveAsPngAsync(fullPath, encoder, cancellationToken);
    }

    private static async Task SaveAsJpegFlattenedAsync(Image image, string fullPath, int quality, CancellationToken cancellationToken)
    {
        using var rgb = image.CloneAs<Rgb24>();
        await rgb.SaveAsJpegAsync(fullPath, new JpegEncoder { Quality = quality }, cancellationToken);
    }

    private static async Task EnsureUnderSizeLimitAsync(Image sourceImage, string fullPath, CancellationToken cancellationToken)
    {
        var fi = new FileInfo(fullPath);
        if (fi.Length <= MaxSavedFileBytes)
        {
            return;
        }

        using var work = sourceImage.Clone(x => { });
        for (var q = 80; q >= 45; q -= 10)
        {
            await SaveAsJpegFlattenedAsync(work, fullPath, q, cancellationToken);
            fi.Refresh();
            if (fi.Length <= MaxSavedFileBytes)
            {
                return;
            }
        }

        for (var pass = 0; pass < 8; pass++)
        {
            var w = Math.Max(MinDimension, (int)Math.Round(work.Width * 0.88));
            var h = Math.Max(MinDimension, (int)Math.Round(work.Height * 0.88));
            if (w == work.Width && h == work.Height)
            {
                break;
            }

            work.Mutate(x => x.Resize(w, h));
            await SaveAsJpegFlattenedAsync(work, fullPath, 75, cancellationToken);
            fi.Refresh();
            if (fi.Length <= MaxSavedFileBytes)
            {
                return;
            }
        }

        if (fi.Length > MaxSavedFileBytes)
        {
            throw new InvalidOperationException(
                "Image is still larger than 2 MB after resizing and compression. Try a smaller source image or lower resolution.");
        }
    }

    private SelectedMediaAsset BuildSelectedAsset(string realCategoryFolderName, string fileName)
    {
        var publicUrl =
            $"{ResolveMediaPublicBaseUrl().TrimEnd('/')}/{realCategoryFolderName}/{Uri.EscapeDataString(fileName)}";
        var guessedAlt = Path.GetFileNameWithoutExtension(fileName).Replace('-', ' ').Replace('_', ' ');
        return new SelectedMediaAsset
        {
            category = realCategoryFolderName,
            url = publicUrl,
            alt_text = guessedAlt,
            tags = realCategoryFolderName,
        };
    }

    private bool TrySelectFallback(string normalizedCategory, out SelectedMediaAsset? asset)
    {
        asset = null;
        if (!FallbackCampaignFilesByCategory.TryGetValue(normalizedCategory, out var names) || names.Length == 0)
        {
            return false;
        }

        var fileName = names[Random.Next(names.Length)];
        asset = BuildSelectedAsset(normalizedCategory, fileName);
        return true;
    }

    private string ResolveMediaRootPath()
    {
        var configured = configuration["Social:MediaRootPath"];
        if (!string.IsNullOrWhiteSpace(configured))
        {
            return Path.GetFullPath(configured);
        }

        var alongsideApp = Path.GetFullPath(Path.Combine(environment.ContentRootPath, "campaign-media"));
        var monorepoDev = Path.GetFullPath(
            Path.Combine(environment.ContentRootPath, "..", "frontend", "public", "campaign-media"));

        if (Directory.Exists(alongsideApp))
        {
            return alongsideApp;
        }

        if (Directory.Exists(monorepoDev))
        {
            return monorepoDev;
        }

        return alongsideApp;
    }

    private string ResolveMediaPublicBaseUrl()
    {
        var configured = configuration["Social:MediaPublicBaseUrl"];
        if (!string.IsNullOrWhiteSpace(configured))
        {
            return configured;
        }

        var frontendBase = configuration["App:FrontendBaseUrl"] ?? "https://panahgah.up.railway.app";
        return $"{frontendBase.TrimEnd('/')}/campaign-media";
    }
}
