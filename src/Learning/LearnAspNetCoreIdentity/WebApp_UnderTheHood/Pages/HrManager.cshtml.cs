using System.Net.Http.Headers;
using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using WebApp_UnderTheHood.Auth;
using WebApp_UnderTheHood.Authorization.Dtos;
using WebApp_UnderTheHood.Common.Extensions;
using WebApp_UnderTheHood.Dtos;
using WebApp_UnderTheHood.Helpers;
using WebApp_UnderTheHood.Pages.Account;

namespace WebApp_UnderTheHood.Pages
{
    [Authorize(Policy = "HrManagerOnly")]
    public class HrManagerModel : PageModel
    {
        private readonly InvokeApiHelper invokeApiHelper;

        [BindProperty]
        public List<WeatherForecastDto> WeatherForecastItems { get; set; } = new List<WeatherForecastDto>();

        public HrManagerModel(InvokeApiHelper invokeApiHelper)
        {
            this.invokeApiHelper = invokeApiHelper;
        }

        public async Task OnGetAsync()
        {
            WeatherForecastItems = 
                await invokeApiHelper.InvokeEndpoint<List<WeatherForecastDto>>(
                    httpClientName: "OurWebApi",
                    endpointUrl: "WeatherForecast",
                    credential: new Credential() { UserName = "admin", Password = "password" }) ??
                new List<WeatherForecastDto>();
        }

        
    }
}
