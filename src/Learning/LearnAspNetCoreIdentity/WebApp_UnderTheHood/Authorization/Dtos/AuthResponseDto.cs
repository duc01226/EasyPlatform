using WebApp_UnderTheHood.Dtos.Abstract;

namespace WebApp_UnderTheHood.Authorization.Dtos
{
    public class JwtTokenResponseDto : Dto
    {
        public string AccessToken { get; set; } = "";

        public DateTime ExpiresAt { get; set; }

        public bool IsAccessTokenExpired() => ExpiresAt <= DateTime.UtcNow;
    }
}
