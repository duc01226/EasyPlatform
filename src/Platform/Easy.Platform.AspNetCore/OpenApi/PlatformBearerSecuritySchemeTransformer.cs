using System;
using System.Collections.Generic;
using System.Linq;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.OpenApi;
using Microsoft.OpenApi.Models;

namespace Easy.Platform.AspNetCore.OpenApi;

/// <summary>
/// Transforms OpenAPI documents to include Bearer token authentication scheme configuration.
/// This transformer automatically adds JWT Bearer authentication security definitions to the OpenAPI specification,
/// enabling proper authentication documentation for API endpoints.
/// </summary>
/// <remarks>
/// This class is part of the Easy.Platform ASP.NET Core integration and provides standardized
/// Bearer token authentication setup for OpenAPI/Swagger documentation across all EasyPlatform microservices.
/// The transformer ensures that API documentation properly reflects the authentication requirements
/// and provides clear guidance for API consumers on how to authenticate requests.
///
/// Key responsibilities:
/// - Registers Bearer authentication scheme in OpenAPI components
/// - Applies Bearer token requirements to all API operations
/// - Integrates with ASP.NET Core's authentication scheme provider
/// - Supports JWT token format documentation
/// </remarks>
public class PlatformBearerSecuritySchemeTransformer : IOpenApiDocumentTransformer
{
    /// <summary>
    /// The authentication scheme provider used to discover available authentication schemes.
    /// This dependency allows the transformer to conditionally apply Bearer authentication
    /// only when a Bearer scheme is actually configured in the application.
    /// </summary>
    private readonly IAuthenticationSchemeProvider authenticationSchemeProvider;

    /// <summary>
    /// Initializes a new instance of the <see cref="PlatformBearerSecuritySchemeTransformer"/> class.
    /// </summary>
    /// <param name="authenticationSchemeProvider">
    /// The authentication scheme provider that provides access to all registered authentication schemes.
    /// Used to verify that Bearer authentication is configured before applying security requirements.
    /// </param>
    /// <exception cref="ArgumentNullException">
    /// Thrown when <paramref name="authenticationSchemeProvider"/> is null.
    /// </exception>
    public PlatformBearerSecuritySchemeTransformer(IAuthenticationSchemeProvider authenticationSchemeProvider)
    {
        this.authenticationSchemeProvider = authenticationSchemeProvider;
    }

    /// <summary>
    /// Transforms the OpenAPI document by adding Bearer token authentication scheme and security requirements.
    /// This method examines the configured authentication schemes and, if Bearer authentication is found,
    /// adds the necessary security definitions and applies them to all API operations.
    /// </summary>
    /// <param name="document">
    /// The OpenAPI document to transform. Security schemes and requirements will be added to this document.
    /// </param>
    /// <param name="context">
    /// The transformation context containing additional information about the document transformation process.
    /// </param>
    /// <param name="cancellationToken">
    /// A cancellation token that can be used to cancel the transformation operation.
    /// </param>
    /// <returns>
    /// A task representing the asynchronous transformation operation.
    /// </returns>
    /// <remarks>
    /// The transformation process:
    /// 1. Queries all registered authentication schemes via the authentication scheme provider
    /// 2. Checks if a "Bearer" scheme is configured
    /// 3. If found, adds Bearer security scheme to the document components
    /// 4. Applies Bearer authentication as a requirement for all API operations
    ///
    /// The Bearer scheme configuration includes:
    /// - Type: HTTP authentication
    /// - Scheme: "bearer" (standard HTTP authentication scheme)
    /// - Location: Authorization header
    /// - Format: JSON Web Token (JWT)
    /// </remarks>
    public virtual async Task TransformAsync(OpenApiDocument document, OpenApiDocumentTransformerContext context, CancellationToken cancellationToken)
    {
        // Retrieve all configured authentication schemes from the DI container
        var authenticationSchemes = await authenticationSchemeProvider.GetAllSchemesAsync();

        // Only proceed if Bearer authentication is configured in the application
        if (authenticationSchemes.Any(authScheme => authScheme.Name == "Bearer"))
        {
            // Configure the Bearer security scheme definition for OpenAPI documentation
            // Add the security scheme at the document level
            var requirements = new Dictionary<string, OpenApiSecurityScheme>
            {
                ["Bearer"] = new()
                {
                    Type = SecuritySchemeType.Http, // HTTP authentication type
                    Scheme = "bearer", // "bearer" refers to the authorization scheme
                    In = ParameterLocation.Header, // Token is passed in the Authorization header
                    BearerFormat =
                        "Json Web Token" // Indicates JWT format for better documentation
                    ,
                },
            };

            // Ensure the document has a components section and add security schemes
            document.Components ??= new OpenApiComponents();
            document.Components.SecuritySchemes = requirements;

            // Apply Bearer authentication as a requirement for all API operations
            // This ensures all endpoints in the API documentation show authentication requirements
            foreach (var operation in document.Paths.Values.SelectMany(path => path.Operations))
            {
                operation.Value.Security.Add(
                    new OpenApiSecurityRequirement
                    {
                        // Reference the Bearer scheme defined above
                        [
                            new OpenApiSecurityScheme
                            {
                                Reference = new OpenApiReference { Id = "Bearer", Type = ReferenceType.SecurityScheme },
                            }
                        ] = [],
                    }
                );
            }
        }
    }
}
