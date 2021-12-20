using System.Text.Json.Serialization;

namespace AngularDotnetPlatform.Platform.FirebasePushNotification.GoogleFcm
{
    internal class FcmResult
    {
        [JsonPropertyName("message_id")]
        public string MessageId { get; set; }

        [JsonPropertyName("registration_id")]
        public string RegistrationId { get; set; }

        public string Error { get; set; }
    }
}
