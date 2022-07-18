using ApiJwtAuthenticationExample.Auth.Dtos.Abstract;

namespace ApiJwtAuthenticationExample.Auth.Dtos;

public class ResponseDto : Dto
{
    public static ResponseDto Create(Statuses status, string? message = null)
    {
        return new ResponseDto()
        {
            Status = status,
            Message = message
        };
    }

    public Statuses Status { get; set; }
    public string? Message { get; set; }

    public enum Statuses
    {
        Error,
        Success
    }
}