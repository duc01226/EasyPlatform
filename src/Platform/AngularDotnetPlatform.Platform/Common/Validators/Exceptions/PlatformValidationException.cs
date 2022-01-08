using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace AngularDotnetPlatform.Platform.Common.Validators.Exceptions
{
    public interface IPlatformValidationException
    {
        public string Message { get; }
        public PlatformValidationResult ValidationResult { get; set; }
    }

    public class PlatformValidationException : Exception, IPlatformValidationException
    {
        public PlatformValidationException(PlatformValidationResult validationResult) : base(validationResult.ToString())
        {
            ValidationResult = validationResult;
        }

        public PlatformValidationResult ValidationResult { get; set; }
    }
}
