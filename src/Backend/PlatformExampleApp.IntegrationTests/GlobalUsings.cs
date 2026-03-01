#pragma warning disable IDE0005 // Using directive is unnecessary.
global using System;
global using System.Collections.Generic;
global using System.Linq;
global using System.Threading;
global using System.Threading.Tasks;
global using Easy.Platform.AutomationTest;
global using Easy.Platform.AutomationTest.IntegrationTests;
global using Easy.Platform.Common;
global using Easy.Platform.Common.Extensions;
global using Easy.Platform.Common.Validations;
global using Easy.Platform.Common.Validations.Exceptions;
global using Xunit;

// Alias for PlatformIntegrationTestHelper — enables using IntegrationTestHelper.UniqueName(...) throughout tests
global using IntegrationTestHelper = Easy.Platform.AutomationTest.IntegrationTests.PlatformIntegrationTestHelper;
