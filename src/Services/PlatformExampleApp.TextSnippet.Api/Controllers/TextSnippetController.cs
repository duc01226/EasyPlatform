using System;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using AngularDotnetPlatform.Platform.AspNetCore.Controllers;
using AngularDotnetPlatform.Platform.Caching;
using AngularDotnetPlatform.Platform.Cqrs;
using Microsoft.Extensions.Configuration;
using PlatformExampleApp.TextSnippet.Application.Caching;
using PlatformExampleApp.TextSnippet.Application.UseCaseCommands;
using PlatformExampleApp.TextSnippet.Application.UserCaseQueries;

// For more information on enabling Web API for empty projects, visit https://go.microsoft.com/fwlink/?LinkID=397860

namespace PlatformExampleApp.TextSnippet.Api.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class TextSnippetController : PlatformBaseController
    {
        public TextSnippetController(IPlatformCqrs cqrs, IPlatformCacheRepositoryProvider cacheRepositoryProvider, IConfiguration configuration) : base(cqrs, cacheRepositoryProvider, configuration)
        {
        }

        // GET: api/<TextSnippetController>
        [HttpGet]
        [Route("search")]
        public async Task<SearchSnippetTextQueryResult> Search([FromQuery] SearchSnippetTextQuery request)
        {
            // Using default last registered cache repository (default is built-in memory cache).
            //return await CacheRepositoryProvider.GetCollection<TextSnippetApplicationCollectionCacheKeyProvider>()
            //    .CacheRequestAsync(
            //        () => Cqrs.SendQuery<SearchSnippetTextQuery, SearchSnippetTextQueryResult>(request),
            //        new object[] { nameof(Search), request },
            //        new TextSnippetConfigurationCollectionCacheEntryOptions(Configuration));

            // Test case use default CacheEntryOptions. Could be configured via override DefaultPlatformCacheEntryOptions in module
            return await CacheRepositoryProvider.GetCollection<TextSnippetApplicationCollectionCacheKeyProvider>()
                .CacheRequestAsync(
                    () => Cqrs.SendQuery<SearchSnippetTextQuery, SearchSnippetTextQueryResult>(request),
                    requestKeyParts: new object[] { nameof(Search), request });

            // Using distributed cache
            return await CacheRepositoryProvider.GetCollection<TextSnippetApplicationCollectionCacheKeyProvider>(PlatformCacheRepositoryType.Distributed)
                .CacheRequestAsync(
                    () => Cqrs.SendQuery<SearchSnippetTextQuery, SearchSnippetTextQueryResult>(request),
                    new object[] { nameof(Search), request },
                    new TextSnippetConfigurationCollectionCacheEntryOptions(Configuration));
        }

        // POST api/<TextSnippetController>
        [HttpPost]
        [Route("save")]
        public async Task<SaveSnippetTextCommandResult> Save([FromBody] SaveSnippetTextCommand request)
        {
            RandomThrowToTestHandleInternalException();

            return await Cqrs.SendCommand<SaveSnippetTextCommand, SaveSnippetTextCommandResult>(request);
        }

        [HttpGet]
        [Route("testHandleInternalException")]
        public Task TestHandleInternalException()
        {
            throw new Exception("TestLoggingForInternalException");
        }

        private static void RandomThrowToTestHandleInternalException()
        {
            if (new Random().Next(0, 10) % 2 == 0)
            {
                throw new Exception("Test HandleInternalException");
            }
        }
    }
}
