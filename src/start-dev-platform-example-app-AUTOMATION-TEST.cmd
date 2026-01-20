REM Test BDD Chrome
set AutomationTestSettings__WebDriverType=Chrome
dotnet test ./Backend/PlatformExampleApp.Test.BDD/PlatformExampleApp.Test.BDD.csproj
livingdoc test-assembly ./Backend/PlatformExampleApp.Test.BDD/bin/Debug/net7.0/PlatformExampleApp.Test.BDD.dll -t ./Backend/PlatformExampleApp.Test.BDD/bin/Debug/net7.0/TestExecution.json --title=Test-Platform-Test-Snippet-Using-Chrome
start "" "./Backend/PlatformExampleApp.Test.BDD/bin/Debug/net7.0/LivingDoc.html"

REM Test BDD Edge
set AutomationTestSettings__WebDriverType=Edge
dotnet test ./Backend/PlatformExampleApp.Test.BDD/PlatformExampleApp.Test.BDD.csproj
livingdoc test-assembly ./Backend/PlatformExampleApp.Test.BDD/bin/Debug/net7.0/PlatformExampleApp.Test.BDD.dll -t ./Backend/PlatformExampleApp.Test.BDD/bin/Debug/net7.0/TestExecution.json --title=Test-Platform-Test-Snippet-Using-Edge
start "" "./Backend/PlatformExampleApp.Test.BDD/bin/Debug/net7.0/LivingDoc.html"

REM Test BDD Firefox
set AutomationTestSettings__WebDriverType=Firefox
dotnet test ./Backend/PlatformExampleApp.Test.BDD/PlatformExampleApp.Test.BDD.csproj
livingdoc test-assembly ./Backend/PlatformExampleApp.Test.BDD/bin/Debug/net7.0/PlatformExampleApp.Test.BDD.dll -t ./Backend/PlatformExampleApp.Test.BDD/bin/Debug/net7.0/TestExecution.json --title=Test-Platform-Test-Snippet-Using-Firefox
start "" "./Backend/PlatformExampleApp.Test.BDD/bin/Debug/net7.0/LivingDoc.html"

pause
