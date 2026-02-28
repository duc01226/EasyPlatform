# Hiring Process Management - AI Companion

**Purpose**: Code-focused context for AI assistants working on this feature.

---

## Quick Reference

### Entity Locations

```
Backend:
├── Domain
│   ├── Pipeline.cs          → src/Services/bravoTALENTS/Candidate.Domain/AggregatesModel/Pipeline.cs
│   ├── Stage.cs              → src/Services/bravoTALENTS/Candidate.Domain/AggregatesModel/Stage.cs
│   └── StageOrder.cs         → src/Services/bravoTALENTS/Candidate.Domain/AggregatesModel/StageOrder.cs
├── Application
│   ├── Pipelines/Commands/   → SavePipelineCommand, DeletePipelineCommand, DuplicatePipelineCommand
│   ├── Pipelines/Queries/    → GetPipelineListQuery, GetPipelineByIdQuery, GetDefaultPipelineQuery
│   ├── Stage/Command/        → SaveStageCommand, DeleteStageCommand
│   └── Stage/Queries/        → GetStageListQuery
├── Persistence
│   ├── PipelineRepository.cs → Extended repository methods
│   └── DataMigrations/       → 20251216000000_MigrateDefaultStagesForExistingCompanies.cs
└── Service
    ├── PipelineController.cs → REST API for pipelines
    └── StageController.cs    → REST API for stages

Frontend:
├── Settings Module
│   ├── hiring-process-page/  → Main list page component
│   └── hiring-stages-page/   → Stage management page
├── Shared Components
│   ├── save-hiring-process-form/ → Pipeline builder dialog (722 lines)
│   ├── workflow-card/        → Pipeline card display
│   ├── hiring-process-selection/ → Pipeline dropdown
│   └── hiring-process-status/ → Status badge
├── Services
│   ├── hiring-process.service.ts → HiringProcessApiService (savePipeline, setDefaultPipeline, duplicateHiringProcess, deleteHiringProcess)
│   └── stage.service.ts      → StageService
└── Models
    ├── hiring-process.model.ts → HiringProcess class
    └── stage.model.ts        → Stage class
```

---

## Key Patterns

### Backend Command Pattern

```csharp
// Command in Candidate.Application/Pipelines/Commands/SavePipelineCommand.cs
public sealed class SavePipelineCommand : PlatformCqrsCommand<SavePipelineCommandResult>
{
    public PipelineDto Pipeline { get; set; }
    public bool IsSetDefaultOnly { get; set; }

    public override PlatformValidationResult<IPlatformCqrsRequest> Validate()
    {
        if (IsSetDefaultOnly)
        {
            return base.Validate()
                .And(x => Pipeline?.Id.IsNotNullOrEmpty() == true, "Pipeline ID is required for set default operation");
        }
        return base.Validate()
            .And(x => Pipeline.Name.IsNotNullOrEmpty(), "Name required")
            .And(x => Pipeline.StageIds.Count >= 4, "Min 4 stages");
    }
}

// Handler validates async constraints
protected override async Task<PlatformValidationResult<SavePipelineCommand>> ValidateRequestAsync(...)
    => await validation
        .AndAsync(r => stageRepository.GetByIdsAsync(r.Pipeline.StageIds).Then(s => s.Count == r.Pipeline.StageIds.Count), "Invalid stage IDs")
        .AndAsync(r => ValidateStageOrderConstraints(r), "Invalid stage order");
```

### Frontend Model with Business Logic

```typescript
// Model in shared/models/hiring-process.model.ts
export class HiringProcess {
    canUpdateStages(): boolean {
        return this.isUsedByJobs === false && this.isUsedByApplications === false;
    }

    canDelete(): boolean {
        return this.isUsedByJobs === false && this.isDefault === false && this.isUsedByApplications === false;
    }

    getNextAllowedStatuses(): StageStatus[] {
        switch (this.status) {
            case StageStatus.Draft: return [StageStatus.Published];
            case StageStatus.Published: return this.canUnpublishStatus() ? [StageStatus.Draft, StageStatus.Archived] : [StageStatus.Archived];
            case StageStatus.Archived: return [StageStatus.Published];
            default: return [];
        }
    }
}
```

### Frontend API Pattern with effectSimple

```typescript
// Service method in hiring-process.service.ts
public setDefaultPipeline(pipelineId: string) {
    return this.post<{ pipeline: HiringProcess }>('',
        { pipeline: { id: pipelineId }, isSetDefaultOnly: true },
        { enableCache: false }
    );
}

// Component usage with effectSimple pattern
public readonly setDefaultPipeline = this.effectSimple((pipeline: HiringProcess) => {
    return this.hiringProcessApiService.setDefaultPipeline(pipeline.id).pipe(
        this.tapResponse(
            () => {
                this.toast.success(this.translateSrv.getValue('Set default hiring process successfully'));
                this.reload();
            },
            () => {
                this.toast.error(this.translateSrv.getValue('Set default hiring process failed'));
            }
        )
    );
}, 'setDefaultPipeline');
```

### Stage Grouping in Model

```typescript
// Static methods in Stage class
export class Stage {
    static getStageStartGroup(stages?: Stage[]) {
        return cloneDeep(stages?.filter(s => s.category === StageCategory.Application).sort((a, b) => a.order - b.order));
    }

    static getStageCustomGroup(stages?: Stage[]) {
        return cloneDeep(stages?.filter(s => s.category === StageCategory.AssessmentAndInterview).sort((a, b) => a.order - b.order));
    }

    static getStageEndGroup(stages?: Stage[]) {
        return cloneDeep(stages?.filter(s => s.category === StageCategory.Offer || s.category === StageCategory.Hired).sort((a, b) => a.order - b.order));
    }
}
```

---

## API Endpoints

| Method | Endpoint                          | Handler                                                       |
| ------ | --------------------------------- | ------------------------------------------------------------- |
| GET    | `/api/Pipeline`                   | `GetPipelineListQueryHandler`                                 |
| GET    | `/api/Pipeline/{id}`              | `GetPipelineByIdQueryHandler`                                 |
| GET    | `/api/Pipeline/default`           | `GetDefaultPipelineQueryHandler`                              |
| POST   | `/api/Pipeline`                   | `SavePipelineCommandHandler` (supports IsSetDefaultOnly flag) |
| DELETE | `/api/Pipeline/{id}`              | `DeletePipelineCommandHandler`                                |
| POST   | `/api/Pipeline/duplicate/{id}`    | `DuplicatePipelineCommandHandler`                             |
| GET    | `/api/Pipeline/check-unique-name` | `CheckPipelineNameUniquenessQueryHandler`                     |
| GET    | `/api/Stage`                      | `GetStageListQueryHandler`                                    |
| POST   | `/api/Stage`                      | `SaveStageCommandHandler`                                     |
| DELETE | `/api/Stage/{id}`                 | `DeleteStageCommandHandler`                                   |

---

## Business Rules Implementation

| Rule                                     | Implementation Location                                         |
| ---------------------------------------- | --------------------------------------------------------------- |
| Unique pipeline name                     | `CheckPipelineNameUniquenessQuery.cs` + async validator in form |
| Min 4 stages                             | `SavePipelineCommand.Validate()`                                |
| First=Sourced, Last=Hired                | `SavePipelineCommandHandler.ValidateStageOrderConstraints()`    |
| Cannot delete if used by jobs            | `DeletePipelineCommandHandler.ValidateRequestAsync()`           |
| Cannot delete default                    | `DeletePipelineCommandHandler.ValidateRequestAsync()`           |
| Cannot modify stages if has applications | `HiringProcess.canUpdateStages()` frontend check                |

---

## Key Files to Modify

When working on this feature, commonly modified files:

**Adding new pipeline field**:
1. `Pipeline.cs` - Add property
2. `PipelineDto.cs` - Add property and mapping
3. `HiringProcess` model - Add property
4. `save-hiring-process-form.component.ts` - Add to form

**Adding new stage field**:
1. `Stage.cs` - Add property
2. `StageDto.cs` - Add property and mapping
3. `Stage` model - Add property

**Adding new validation rule**:
1. Command `Validate()` method for sync rules
2. Handler `ValidateRequestAsync()` for async rules

---

## Testing Patterns

### Backend Command Test

```csharp
[Fact]
public async Task SavePipeline_WithValidData_ShouldSucceed()
{
    // Arrange
    var command = new SavePipelineCommand {
        Pipeline = new PipelineDto {
            Name = "Test Pipeline",
            StageIds = [sourcedId, appliedId, offerId, hiredId],
            Status = StageStatus.Draft
        }
    };

    // Act
    var result = await handler.Handle(command, CancellationToken.None);

    // Assert
    result.Pipeline.Should().NotBeNull();
    result.Pipeline.Name.Should().Be("Test Pipeline");
}
```

### Frontend Component Test

```typescript
describe('HiringProcessPageComponent', () => {
    it('should load pipelines on init', () => {
        component.ngOnInit();
        expect(apiService.getHiringProcessList).toHaveBeenCalled();
    });

    it('should open dialog when create clicked', () => {
        component.openDialogSaveProcessForm();
        expect(dialogService.openDialogRef).toHaveBeenCalled();
    });
});
```

---

## Common Queries

**Find all pipelines for a company**:
```csharp
await pipelineRepository.GetAllAsync(p => p.OrganizationalUnitId == companyId);
```

**Find stages in global order**:
```csharp
var stageOrder = await stageOrderRepository.FirstOrDefaultAsync(s => s.CompanyId == companyId);
var orderedStages = await stageRepository.GetByIdsAsync(stageOrder.GlobalOrder);
```

**Check if pipeline is used**:
```csharp
var isUsedByJobs = await jobRepository.AnyAsync(j => j.PipelineId == pipelineId);
var isUsedByApplications = await candidateRepository.HasAnyApplicationInPipelineAsync(companyId, pipelineId);
```

---

## Related Files

- `PipelineNameConstants.cs` - Default stage names and translations
- `LanguageString.cs` (Shared) - Multi-language value object
- `MongoDbEnumSerializationConfiguration.cs` - Enum serialization for StageStatus/StageCategory
