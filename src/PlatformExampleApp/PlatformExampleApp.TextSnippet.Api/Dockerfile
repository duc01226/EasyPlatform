#See https://aka.ms/containerfastmode to understand how Visual Studio uses this Dockerfile to build your images for faster debugging.

FROM mcr.microsoft.com/dotnet/sdk:5.0 AS base
WORKDIR /app
EXPOSE 80
EXPOSE 443

FROM mcr.microsoft.com/dotnet/sdk:5.0 AS build
WORKDIR /src
COPY Platform Platform
COPY PlatformExampleApp/PlatformExampleApp.TextSnippet.Api/PlatformExampleApp.TextSnippet.Api.csproj PlatformExampleApp/PlatformExampleApp.TextSnippet.Api/PlatformExampleApp.TextSnippet.Api.csproj
COPY PlatformExampleApp/PlatformExampleApp.TextSnippet.Application/PlatformExampleApp.TextSnippet.Application.csproj PlatformExampleApp/PlatformExampleApp.TextSnippet.Application/PlatformExampleApp.TextSnippet.Application.csproj
COPY PlatformExampleApp/PlatformExampleApp.TextSnippet.Domain/PlatformExampleApp.TextSnippet.Domain.csproj PlatformExampleApp/PlatformExampleApp.TextSnippet.Domain/PlatformExampleApp.TextSnippet.Domain.csproj
COPY PlatformExampleApp/PlatformExampleApp.TextSnippet.Persistence/PlatformExampleApp.TextSnippet.Persistence.csproj PlatformExampleApp/PlatformExampleApp.TextSnippet.Persistence/PlatformExampleApp.TextSnippet.Persistence.csproj
COPY PlatformExampleApp/PlatformExampleApp.TextSnippet.Persistence.Mongo/PlatformExampleApp.TextSnippet.Persistence.Mongo.csproj PlatformExampleApp/PlatformExampleApp.TextSnippet.Persistence.Mongo/PlatformExampleApp.TextSnippet.Persistence.Mongo.csproj
COPY PlatformExampleApp/PlatformExampleApp.TextSnippet.Persistence.MultiDbDemo.Mongo/PlatformExampleApp.TextSnippet.Persistence.MultiDbDemo.Mongo.csproj PlatformExampleApp/PlatformExampleApp.TextSnippet.Persistence.MultiDbDemo.Mongo/PlatformExampleApp.TextSnippet.Persistence.MultiDbDemo.Mongo.csproj
COPY PlatformExampleApp/PlatformExampleApp.TextSnippet.Infrastructure/PlatformExampleApp.TextSnippet.Infrastructure.csproj PlatformExampleApp/PlatformExampleApp.TextSnippet.Infrastructure/PlatformExampleApp.TextSnippet.Infrastructure.csproj
COPY NuGetDocker.Config PlatformExampleApp/PlatformExampleApp.TextSnippet.Api/NuGet.Config

RUN dotnet restore "PlatformExampleApp/PlatformExampleApp.TextSnippet.Api/PlatformExampleApp.TextSnippet.Api.csproj"

COPY PlatformExampleApp/PlatformExampleApp.TextSnippet.Api PlatformExampleApp/PlatformExampleApp.TextSnippet.Api
COPY PlatformExampleApp/PlatformExampleApp.TextSnippet.Application PlatformExampleApp/PlatformExampleApp.TextSnippet.Application
COPY PlatformExampleApp/PlatformExampleApp.TextSnippet.Domain PlatformExampleApp/PlatformExampleApp.TextSnippet.Domain
COPY PlatformExampleApp/PlatformExampleApp.TextSnippet.Persistence PlatformExampleApp/PlatformExampleApp.TextSnippet.Persistence
COPY PlatformExampleApp/PlatformExampleApp.TextSnippet.Persistence.Mongo PlatformExampleApp/PlatformExampleApp.TextSnippet.Persistence.Mongo
COPY PlatformExampleApp/PlatformExampleApp.TextSnippet.Persistence.MultiDbDemo.Mongo PlatformExampleApp/PlatformExampleApp.TextSnippet.Persistence.MultiDbDemo.Mongo
COPY PlatformExampleApp/PlatformExampleApp.TextSnippet.Infrastructure PlatformExampleApp/PlatformExampleApp.TextSnippet.Infrastructure

FROM build AS publish
RUN dotnet publish "PlatformExampleApp/PlatformExampleApp.TextSnippet.Api/PlatformExampleApp.TextSnippet.Api.csproj" -c Release -o /app/publish --no-restore

FROM base AS final
WORKDIR /app
COPY --from=publish /app/publish .
ENTRYPOINT ["dotnet", "PlatformExampleApp.TextSnippet.Api.dll"]
