namespace PlatformExampleApp.Test.Shared.CommonUiComponents;

public class FormFieldUiComponent : UiComponent<FormFieldUiComponent>
{
    public FormFieldUiComponent(IWebDriver webDriver, Func<IWebElement>? directReferenceRootElement, IUiComponent? parent = null) : base(
        webDriver,
        directReferenceRootElement,
        parent)
    {
    }

    public override string RootElementClassSelector => ".mat-mdc-form-field";
    public IWebElement? InputElement => FindChildOrRootElement(childElementSelector: ".mat-mdc-input-element");
    public string Value => InputElement?.Value() ?? "";

    public FormFieldUiComponent SendKeysAndFocusOut(string text)
    {
        return SendKeysAndFocusOut(text, childElementSelector: ".mat-mdc-input-element");
    }

    public FormFieldUiComponent Clear()
    {
        return Clear(childElementSelector: ".mat-mdc-input-element");
    }

    public FormFieldUiComponent ReplaceTextAndEnter(string text)
    {
        return Clear().SendKeysAndFocusOut(text);
    }
}