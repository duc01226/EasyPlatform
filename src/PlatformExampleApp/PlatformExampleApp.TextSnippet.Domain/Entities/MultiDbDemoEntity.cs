using Easy.Platform.Domain.Entities;

namespace PlatformExampleApp.TextSnippet.Domain.Entities;

/// <summary>
/// This entity is for demo multi db application. Mean that different entity maybe be stored in different db
/// </summary>
public sealed class MultiDbDemoEntity : RootEntity<MultiDbDemoEntity, string>
{
    public string Name { get; set; }
}
