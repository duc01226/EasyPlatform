using Microsoft.AspNetCore.Mvc;

namespace NoCeiling.Duc.Interview.Test.TextSnippet.Api.Controllers
{
    [Route("")]
    public class HomeController : ControllerBase
    {
        [HttpGet]
        public IActionResult Index()
        {
            return new RedirectResult("~/swagger");
        }
    }
}
