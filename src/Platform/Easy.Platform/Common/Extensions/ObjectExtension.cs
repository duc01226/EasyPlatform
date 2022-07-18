namespace Easy.Platform.Common.Extensions
{
    public static class ObjectExtension
    {
        /// <summary>
        /// Pipe the current target object through the <param name="withPipeThroughTargetAction"></param> and return the same current target object
        /// </summary>
        public static T With<T>(this T target, Action<T> withPipeThroughTargetAction)
        {
            withPipeThroughTargetAction(target);

            return target;
        }
    }
}
