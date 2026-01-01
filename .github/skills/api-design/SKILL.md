---
name: api-design
description: Use when designing or modifying REST API endpoints, controller structure, route patterns, request/response DTOs.
---

# REST API Design for EasyPlatform

## Required Reading

**For comprehensive C# backend patterns, you MUST read:**

**`docs/claude/backend-csharp-complete-guide.md`** - Complete patterns for controllers, authorization, CQRS, DTOs

---

## Controller Pattern

```csharp
[ApiController]
[Route("api/[controller]")]
[PlatformAuthorize]
public class EmployeeController : PlatformBaseController
{
    // GET api/employee - List
    [HttpGet]
    public async Task<IActionResult> GetList([FromQuery] GetEmployeeListQuery query)
        => Ok(await Cqrs.SendAsync(query));

    // GET api/employee/{id} - Get by ID
    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(string id)
        => Ok(await Cqrs.SendAsync(new GetEmployeeByIdQuery { Id = id }));

    // POST api/employee - Create/Update
    [HttpPost]
    [PlatformAuthorize(Roles = "Admin,Manager")]
    public async Task<IActionResult> Save([FromBody] SaveEmployeeCommand command)
        => Ok(await Cqrs.SendAsync(command));

    // DELETE api/employee/{id}
    [HttpDelete("{id}")]
    [PlatformAuthorize(Roles = "Admin")]
    public async Task<IActionResult> Delete(string id)
        => Ok(await Cqrs.SendAsync(new DeleteEmployeeCommand { Id = id }));

    // POST api/employee/search - Complex search
    [HttpPost("search")]
    public async Task<IActionResult> Search([FromBody] SearchEmployeesQuery query)
        => Ok(await Cqrs.SendAsync(query));

    // POST api/employee/{id}/activate - Custom action
    [HttpPost("{id}/activate")]
    public async Task<IActionResult> Activate(string id)
        => Ok(await Cqrs.SendAsync(new ActivateEmployeeCommand { Id = id }));
}
```

## Route Naming Conventions

| Action         | HTTP Method | Route Pattern                   |
| -------------- | ----------- | ------------------------------- |
| List           | GET         | `/api/{resource}`               |
| Get by ID      | GET         | `/api/{resource}/{id}`          |
| Create/Update  | POST        | `/api/{resource}`               |
| Delete         | DELETE      | `/api/{resource}/{id}`          |
| Complex Search | POST        | `/api/{resource}/search`        |
| Custom Action  | POST        | `/api/{resource}/{id}/{action}` |

## Query DTO (GET requests)

```csharp
public record GetEmployeeListQuery : PlatformCqrsPagedQuery<GetEmployeeListQueryResult, EmployeeDto>
{
    public List<EmploymentStatus>? Statuses { get; init; }
    public string? SearchText { get; init; }
    public string? DepartmentId { get; init; }
}
```

## Command DTO (POST)

```csharp
public sealed class SaveEmployeeCommand : PlatformCqrsCommand<SaveEmployeeCommandResult>
{
    public string? Id { get; set; }
    public string FirstName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;

    public override PlatformValidationResult<IPlatformCqrsRequest> Validate()
    {
        return base.Validate()
            .And(_ => FirstName.IsNotNullOrEmpty(), "FirstName is required")
            .And(_ => Email.Contains("@"), "Invalid email format");
    }
}
```

## File Upload

```csharp
[HttpPost("upload")]
[RequestSizeLimit(50 * 1024 * 1024)]  // 50MB
public async Task<IActionResult> Upload([FromForm] UploadCommand command)
    => Ok(await Cqrs.SendAsync(command));

public sealed class UploadCommand : PlatformCqrsCommand<UploadCommandResult>
{
    [FromForm] public IFormFile File { get; set; } = null!;
    [FromForm] public string? Description { get; set; }
}
```

## Anti-Patterns

- **Verbs in URLs**: Use `/employees/123/activate` not `/activateEmployee`
- **Missing Authorization**: Always add `[PlatformAuthorize]`
- **Validation in Controller**: Move to Command/Query `Validate()`
- **Business Logic in Controller**: Keep controllers thin
