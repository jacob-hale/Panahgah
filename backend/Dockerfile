# Build stage
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src
COPY . .
RUN dotnet publish Panahgah.Api.csproj -c Release -o /app/publish

# Runtime stage
FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS final
WORKDIR /app

# Install Python runtime for ML model train/score scripts.
# libgssapi-krb5-2: Npgsql probes Kerberos/GSSAPI on Linux; without it logs show
# "libgssapi_krb5.so.2: cannot open shared object file" (harmless for password auth but noisy / risky).
RUN apt-get update \
    && apt-get install -y --no-install-recommends python3 python3-venv libgssapi-krb5-2 \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt /app/requirements.txt
RUN python3 -m venv /opt/venv \
    && /opt/venv/bin/pip install --upgrade pip \
    && /opt/venv/bin/pip install --no-cache-dir -r /app/requirements.txt

COPY --from=build /app/publish .
ENV PATH="/opt/venv/bin:${PATH}"
EXPOSE 8080
ENTRYPOINT ["dotnet", "Panahgah.Api.dll"]