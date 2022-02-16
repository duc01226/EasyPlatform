using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using AngularDotnetPlatform.Platform.Common.Cqrs.Events;
using AngularDotnetPlatform.Platform.Domain.Events;
using PlatformExampleApp.TextSnippet.Domain.Entities;

namespace PlatformExampleApp.TextSnippet.Domain.Events
{
    public class TransferSnippetTextToMultiDbDemoEntityNameDomainEvent : PlatformCqrsDomainEvent
    {
        public string SnippetText { get; set; }
        public MultiDbDemoEntity TargetEntity { get; set; }

        public static TransferSnippetTextToMultiDbDemoEntityNameDomainEvent Create(string snippetText, MultiDbDemoEntity targetEntity)
        {
            return new TransferSnippetTextToMultiDbDemoEntityNameDomainEvent()
            {
                SnippetText = snippetText,
                TargetEntity = targetEntity
            };
        }
    }
}
