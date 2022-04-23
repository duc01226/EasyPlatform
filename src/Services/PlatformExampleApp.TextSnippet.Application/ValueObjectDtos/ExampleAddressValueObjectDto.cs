using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Easy.Platform.Common.Dtos;
using Easy.Platform.Common.Validators;
using PlatformExampleApp.TextSnippet.Domain.ValueObjects;

namespace PlatformExampleApp.TextSnippet.Application.ValueObjectDtos
{
    public class ExampleAddressValueObjectDto : PlatformValueObjectDto<ExampleAddressValueObject>
    {
        public string Number { get; set; }
        public string Street { get; set; }

        public static ExampleAddressValueObjectDto Create(ExampleAddressValueObject targetObject)
        {
            return new ExampleAddressValueObjectDto() { Number = targetObject.Number, Street = targetObject.Street };
        }

        public override ExampleAddressValueObject MapToObject()
        {
            return new ExampleAddressValueObject()
            {
                Number = Number,
                Street = Street
            };
        }
    }
}
