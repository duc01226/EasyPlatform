#See https://aka.ms/containerfastmode to understand how Visual Studio uses this Dockerfile to build your images for faster debugging.

FROM mcr.microsoft.com/dotnet/aspnet:5.0 AS base
WORKDIR /app
EXPOSE 80
EXPOSE 443

FROM mcr.microsoft.com/dotnet/sdk:5.0 AS build
WORKDIR /src
COPY BuildingBlocks BuildingBlocks
COPY Services/NoCeiling.Duc.Interview.Test.TextSnippet.Api/NoCeiling.Duc.Interview.Test.TextSnippet.Api.csproj Services/NoCeiling.Duc.Interview.Test.TextSnippet.Api/NoCeiling.Duc.Interview.Test.TextSnippet.Api.csproj
COPY Services/NoCeiling.Duc.Interview.Test.TextSnippet.Application/NoCeiling.Duc.Interview.Test.TextSnippet.Application.csproj Services/NoCeiling.Duc.Interview.Test.TextSnippet.Application/NoCeiling.Duc.Interview.Test.TextSnippet.Application.csproj
COPY Services/NoCeiling.Duc.Interview.Test.TextSnippet.Domain/NoCeiling.Duc.Interview.Test.TextSnippet.Domain.csproj Services/NoCeiling.Duc.Interview.Test.TextSnippet.Domain/NoCeiling.Duc.Interview.Test.TextSnippet.Domain.csproj
COPY Services/NoCeiling.Duc.Interview.Test.TextSnippet.Persistence/NoCeiling.Duc.Interview.Test.TextSnippet.Persistence.csproj Services/NoCeiling.Duc.Interview.Test.TextSnippet.Persistence/NoCeiling.Duc.Interview.Test.TextSnippet.Persistence.csproj
RUN dotnet restore "Services/NoCeiling.Duc.Interview.Test.TextSnippet.Api/NoCeiling.Duc.Interview.Test.TextSnippet.Api.csproj"

COPY Services/NoCeiling.Duc.Interview.Test.TextSnippet.Api Services/NoCeiling.Duc.Interview.Test.TextSnippet.Api
COPY Services/NoCeiling.Duc.Interview.Test.TextSnippet.Application Services/NoCeiling.Duc.Interview.Test.TextSnippet.Application
COPY Services/NoCeiling.Duc.Interview.Test.TextSnippet.Domain Services/NoCeiling.Duc.Interview.Test.TextSnippet.Domain
COPY Services/NoCeiling.Duc.Interview.Test.TextSnippet.Persistence Services/NoCeiling.Duc.Interview.Test.TextSnippet.Persistence
WORKDIR "/src/Services/NoCeiling.Duc.Interview.Test.TextSnippet.Api"
RUN dotnet build "NoCeiling.Duc.Interview.Test.TextSnippet.Api.csproj" -c Release -o /app/build

FROM build AS publish
RUN dotnet publish "NoCeiling.Duc.Interview.Test.TextSnippet.Api.csproj" -c Release -o /app/publish

FROM base AS final
WORKDIR /app
COPY --from=publish /app/publish .
ENTRYPOINT ["dotnet", "NoCeiling.Duc.Interview.Test.TextSnippet.Api.dll"]