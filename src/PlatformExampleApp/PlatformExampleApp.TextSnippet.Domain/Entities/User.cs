using Easy.Platform.Domain.Entities;

namespace PlatformExampleApp.TextSnippet.Domain.Entities;

public sealed class UserEntity : RootEntity<UserEntity, string>
{
    public string FirstName { get; set; } = "";
    public string LastName { get; set; } = "";
    public string Email { get; set; } = "";
    public string DepartmentId { get; set; } = "";
    public string DepartmentName { get; set; } = "";
    public bool IsActive { get; set; } = true;

    public string FullName => $"{FirstName} {LastName}".Trim();
}
