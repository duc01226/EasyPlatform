using System.Threading;

namespace AngularDotnetPlatform.Platform.Application.Context.UserContext.Default
{
    /// <summary>
    /// Implementation of <see cref="IPlatformApplicationUserContextAccessor"/>
    /// Inspired by Microsoft.AspNetCore.Http.HttpContextAccessor
    /// </summary>
    public class PlatformDefaultApplicationUserContextAccessor : IPlatformApplicationUserContextAccessor
    {
        private static readonly AsyncLocal<UserContextHolder> UserContextCurrentThread = new AsyncLocal<UserContextHolder>();

        public IPlatformApplicationUserContext Current
        {
            get
            {
                if (UserContextCurrentThread.Value == null)
                {
                    Current = CreateNewContext();
                }

                return UserContextCurrentThread.Value?.Context;
            }
            set
            {
                var holder = UserContextCurrentThread.Value;
                if (holder != null)
                {
                    // Clear current Context trapped in the AsyncLocals, as its done.
                    holder.Context = null;
                }

                if (value != null)
                {
                    // Use an object indirection to hold the Context in the AsyncLocal,
                    // so it can be cleared in all ExecutionContexts when its cleared.
                    UserContextCurrentThread.Value = new UserContextHolder { Context = value };
                }
            }
        }

        protected virtual IPlatformApplicationUserContext CreateNewContext()
        {
            return new PlatformDefaultApplicationUserContext();
        }

        private class UserContextHolder
        {
            public IPlatformApplicationUserContext Context { get; set; }
        }
    }
}
