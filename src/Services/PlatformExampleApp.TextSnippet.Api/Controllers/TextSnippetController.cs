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
        public TextSnippetController(IPlatformCqrs cqrs, IPlatformCacheProvider cacheProvider, IConfiguration configuration) : base(cqrs, cacheProvider, configuration)
        {
        }

        // GET: api/<TextSnippetController>
        [HttpGet]
        [Route("search")]
        public async Task<SearchSnippetTextQueryResult> Search([FromQuery] SearchSnippetTextQuery request)
        {
            return await CacheProvider.Get()
                .CacheRequestAsync(
                    () => Cqrs.SendQuery<SearchSnippetTextQuery, SearchSnippetTextQueryResult>(request),
                    TextSnippetCollectionCacheKeyProvider.CreateKey(new object[] { request }),
                    new TextSnippetCollectionCacheKeyOptions(Configuration));
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
