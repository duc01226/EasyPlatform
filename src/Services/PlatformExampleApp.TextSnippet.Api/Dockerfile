#See https://aka.ms/containerfastmode to understand how Visual Studio uses this Dockerfile to build your images for faster debugging.

FROM mcr.microsoft.com/dotnet/aspnet:5.0 AS base
WORKDIR /app
EXPOSE 80
EXPOSE 443

FROM mcr.microsoft.com/dotnet/sdk:5.0 AS build
WORKDIR /src
COPY Platform/AngularDotnetPlatform.Platform/AngularDotnetPlatform.Platform.csproj Platform/AngularDotnetPlatform.Platform/AngularDotnetPlatform.Platform.csproj
COPY Platform/AngularDotnetPlatform.Platform.AspNetCore/AngularDotnetPlatform.Platform.AspNetCore.csproj Platform/AngularDotnetPlatform.Platform.AspNetCore/AngularDotnetPlatform.Platform.AspNetCore.csproj
COPY Platform/AngularDotnetPlatform.Platform.EfCore/AngularDotnetPlatform.Platform.EfCore.csproj Platform/AngularDotnetPlatform.Platform.EfCore/AngularDotnetPlatform.Platform.EfCore.csproj
COPY Platform/AngularDotnetPlatform.Platform.MongoDB/AngularDotnetPlatform.Platform.MongoDB.csproj Platform/AngularDotnetPlatform.Platform.MongoDB/AngularDotnetPlatform.Platform.MongoDB.csproj
COPY Platform/AngularDotnetPlatform.Platform.RabbitMQ/AngularDotnetPlatform.Platform.RabbitMQ.csproj Platform/AngularDotnetPlatform.Platform.RabbitMQ/AngularDotnetPlatform.Platform.RabbitMQ.csproj
COPY Services/PlatformExampleApp.TextSnippet.Api/PlatformExampleApp.TextSnippet.Api.csproj Services/PlatformExampleApp.TextSnippet.Api/PlatformExampleApp.TextSnippet.Api.csproj
COPY Services/PlatformExampleApp.TextSnippet.Application/PlatformExampleApp.TextSnippet.Application.csproj Services/PlatformExampleApp.TextSnippet.Application/PlatformExampleApp.TextSnippet.Application.csproj
COPY Services/PlatformExampleApp.TextSnippet.Domain/PlatformExampleApp.TextSnippet.Domain.csproj Services/PlatformExampleApp.TextSnippet.Domain/PlatformExampleApp.TextSnippet.Domain.csproj
COPY Services/PlatformExampleApp.TextSnippet.Persistence/PlatformExampleApp.TextSnippet.Persistence.csproj Services/PlatformExampleApp.TextSnippet.Persistence/PlatformExampleApp.TextSnippet.Persistence.csproj
COPY Services/PlatformExampleApp.TextSnippet.Persistence.Mongo/PlatformExampleApp.TextSnippet.Persistence.Mongo.csproj Services/PlatformExampleApp.TextSnippet.Persistence.Mongo/PlatformExampleApp.TextSnippet.Persistence.Mongo.csproj
COPY Services/PlatformExampleApp.TextSnippet.Persistence.MultiDbDemo.Mongo/PlatformExampleApp.TextSnippet.Persistence.MultiDbDemo.Mongo.csproj Services/PlatformExampleApp.TextSnippet.Persistence.MultiDbDemo.Mongo/PlatformExampleApp.TextSnippet.Persistence.MultiDbDemo.Mongo.csproj
RUN dotnet restore "Services/PlatformExampleApp.TextSnippet.Api/PlatformExampleApp.TextSnippet.Api.csproj"

COPY Platform Platform
COPY Services/PlatformExampleApp.TextSnippet.Api Services/PlatformExampleApp.TextSnippet.Api
COPY Services/PlatformExampleApp.TextSnippet.Application Services/PlatformExampleApp.TextSnippet.Application
COPY Services/PlatformExampleApp.TextSnippet.Domain Services/PlatformExampleApp.TextSnippet.Domain
COPY Services/PlatformExampleApp.TextSnippet.Persistence Services/PlatformExampleApp.TextSnippet.Persistence
COPY Services/PlatformExampleApp.TextSnippet.Persistence.Mongo Services/PlatformExampleApp.TextSnippet.Persistence.Mongo
COPY Services/PlatformExampleApp.TextSnippet.Persistence.MultiDbDemo.Mongo Services/PlatformExampleApp.TextSnippet.Persistence.MultiDbDemo.Mongo
WORKDIR "/src/Services/PlatformExampleApp.TextSnippet.Api"
RUN dotnet build "PlatformExampleApp.TextSnippet.Api.csproj" -c Release -o /app/build

FROM build AS publish
RUN dotnet publish "PlatformExampleApp.TextSnippet.Api.csproj" -c Release -o /app/publish

FROM base AS final
WORKDIR /app
COPY --from=publish /app/publish .
ENTRYPOINT ["dotnet", "PlatformExampleApp.TextSnippet.Api.dll"]
