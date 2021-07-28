using Microsoft.AspNetCore.Mvc;

namespace PlatformExampleApp.TextSnippet.Api.Controllers
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
