using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace Panahgah.Api.Data;

/// <summary>
/// Enables <c>dotnet ef migrations</c> without running the full web host. Uses a placeholder connection string;
/// migrations are applied at runtime against the real <c>PanahgahAppConnection</c>.
/// </summary>
public sealed class ApplicationDbContextFactory : IDesignTimeDbContextFactory<ApplicationDbContext>
{
    public ApplicationDbContext CreateDbContext(string[] args)
    {
        var optionsBuilder = new DbContextOptionsBuilder<ApplicationDbContext>();
        var cs = Environment.GetEnvironmentVariable("PanahgahAppConnection")
            ?? Environment.GetEnvironmentVariable("ConnectionStrings__PanahgahAppConnection")
            ?? "Host=127.0.0.1;Port=5432;Database=panahgah_design;Username=postgres;Password=postgres";
        optionsBuilder.UseNpgsql(cs);
        return new ApplicationDbContext(optionsBuilder.Options);
    }
}
