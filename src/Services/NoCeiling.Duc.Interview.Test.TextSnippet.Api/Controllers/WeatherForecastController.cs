using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using Microsoft.Identity.Web.Resource;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace NoCeiling.Duc.Interview.Test.TextSnippet.Api.Controllers
{
    [ApiController]
    [Route("[controller]")]
    public class TextApiController : ControllerBase
    {
        public TextApiController()
        {
        }

        [HttpGet]
        public IEnumerable<string> Get()
        {
            return new List<string>() { "Test1", "Test2" };
        }
    }
}
