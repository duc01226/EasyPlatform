## CustomAnalyzers

**CustomAnalyzers** is a Roslyn analyzer project that enforces your organization’s coding standards.

---

### 🎯 Features

* **DISALLOW\_USING\_STATIC**: Reports an error whenever a `using static` directive is encountered.

---

## 📦 Building and Releasing

1. **Clone the repository**

   ```bash
   git clone https://your.git.repo/CustomAnalyzers.git
   cd CustomAnalyzers
   ```

2. **Build the analyzer**

   ```bash
   dotnet build -c Release
   ```

3. **Locate the output DLL**

   After a successful build, you will find `CustomAnalyzers.dll` in the `bin/Release/net9.0/` folder.

---

## 📁 Consuming in Your Projects

Follow these steps to start using the custom analyzer in any of your downstream projects.

1. **Copy the DLL**

   * Create (or choose) a folder in your solution root named `analyzers` or `src\analyzers`.
   * Copy `CustomAnalyzers.dll` into that folder.

2. **Reference as an Analyzer**

   Open the `.csproj` of the project where you want to enforce the rule, and add:

   ```xml
   <ItemGroup>
     <!-- Point to the analyzer DLL you just copied -->
     <Analyzer Include="..\analyzers\CustomAnalyzers.dll" />
   </ItemGroup>
   ```

   > **Note:** Do *not* add it as a normal `<Reference>`.

3. **Enable Analyzer Execution**

   Ensure analyzers are enabled in your SDK-style project. In most cases this is on by default. To be explicit, you can add:

   ```xml
   <PropertyGroup>
     <!-- Turn on SDK analyzers (including custom ones) -->
     <EnableNETAnalyzers>true</EnableNETAnalyzers>
   </PropertyGroup>
   ```

4. **(Optional) Set Severity**

   You can configure the diagnostic’s severity via your `.editorconfig`:

   ```ini
   [*.cs]
   dotnet_diagnostic.DISALLOW_USING_STATIC.severity = error
   ```

---

## 🚀 Verifying the Analyzer

1. In your consuming project, add a file containing a forbidden directive:

   ```csharp
   using static System.Math;

   namespace Demo
   {
       public class Foo
       {
           // ...
       }
   }
   ```

2. Build the project:

   ```bash
   dotnet build
   ```

3. You should see an error similar to:

   ```text
   error DISALLOW_USING_STATIC: 'using static' directive is not allowed (YourFile.cs:1)
   ```

---

## 🤝 Contributing

* Please open issues or pull requests on the Git repository.
* Follow the existing code style and include tests for new rules.

---

## 📄 License

This project is licensed under the MIT License. See [LICENSE](./LICENSE) for details.
