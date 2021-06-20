using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using NoCeiling.Duc.Interview.Test.Platform.AspNetCore.Controllers;
using NoCeiling.Duc.Interview.Test.Platform.Cqrs;
using NoCeiling.Duc.Interview.Test.TextSnippet.Application.UseCaseCommands;
using NoCeiling.Duc.Interview.Test.TextSnippet.Application.UserCaseQueries;

// For more information on enabling Web API for empty projects, visit https://go.microsoft.com/fwlink/?LinkID=397860

namespace NoCeiling.Duc.Interview.Test.TextSnippet.Api.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class TextSnippetController : PlatformBaseController
    {
        public TextSnippetController(IPlatformCqrs cqrs) : base(cqrs)
        {
        }

        // GET: api/<TextSnippetController>
        [HttpGet]
        [Route("search")]
        public async Task<SearchSnippetTextQueryResult> Get([FromQuery] SearchSnippetTextQuery request)
        {
            return await Cqrs.SendQuery<SearchSnippetTextQuery, SearchSnippetTextQueryResult>(request);
        }

        // POST api/<TextSnippetController>
        [HttpPost]
        [Route("save")]
        public async Task<SaveSnippetTextCommandResult> Save([FromBody] SaveSnippetTextCommand request)
        {
            return await Cqrs.SendCommand<SaveSnippetTextCommand, SaveSnippetTextCommandResult>(request);
        }
    }
}
