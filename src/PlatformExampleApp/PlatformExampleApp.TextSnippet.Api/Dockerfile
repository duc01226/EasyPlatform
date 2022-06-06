#See https://aka.ms/containerfastmode to understand how Visual Studio uses this Dockerfile to build your images for faster debugging.

FROM mcr.microsoft.com/dotnet/sdk:5.0 AS base
WORKDIR /app
EXPOSE 80
EXPOSE 443

FROM mcr.microsoft.com/dotnet/sdk:5.0 AS build
WORKDIR /src

COPY NuGetDocker.Config PlatformExampleApp/PlatformExampleApp.TextSnippet.Api/NuGet.Config

COPY Platform Platform
COPY PlatformExampleApp/PlatformExampleApp.Shared PlatformExampleApp/PlatformExampleApp.Shared
COPY PlatformExampleApp/PlatformExampleApp.TextSnippet.Api PlatformExampleApp/PlatformExampleApp.TextSnippet.Api
COPY PlatformExampleApp/PlatformExampleApp.TextSnippet.Application PlatformExampleApp/PlatformExampleApp.TextSnippet.Application
COPY PlatformExampleApp/PlatformExampleApp.TextSnippet.Domain PlatformExampleApp/PlatformExampleApp.TextSnippet.Domain
COPY PlatformExampleApp/PlatformExampleApp.TextSnippet.Persistence PlatformExampleApp/PlatformExampleApp.TextSnippet.Persistence
COPY PlatformExampleApp/PlatformExampleApp.TextSnippet.Persistence.Mongo PlatformExampleApp/PlatformExampleApp.TextSnippet.Persistence.Mongo
COPY PlatformExampleApp/PlatformExampleApp.TextSnippet.Persistence.MultiDbDemo.Mongo PlatformExampleApp/PlatformExampleApp.TextSnippet.Persistence.MultiDbDemo.Mongo
COPY PlatformExampleApp/PlatformExampleApp.TextSnippet.Infrastructure PlatformExampleApp/PlatformExampleApp.TextSnippet.Infrastructure

FROM build AS publish
RUN dotnet publish "PlatformExampleApp/PlatformExampleApp.TextSnippet.Api/PlatformExampleApp.TextSnippet.Api.csproj" -c Release -o /app/publish

FROM base AS final
WORKDIR /app
COPY --from=publish /app/publish .
ENTRYPOINT ["/bin/sh", "-c" , "update-ca-certificates && dotnet PlatformExampleApp.TextSnippet.Api.dll"]
