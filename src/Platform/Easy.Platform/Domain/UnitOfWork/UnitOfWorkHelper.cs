namespace Easy.Platform.Domain.UnitOfWork;

public static class UnitOfWorkHelper
{
    public static TInnerUow FindFirstInnerUowOfType<TInnerUow>(List<IUnitOfWork> innerUnitOfWorks)
        where TInnerUow : class, IUnitOfWork
    {
        foreach (var innerUnitOfWork in innerUnitOfWorks)
            if (innerUnitOfWork.GetType().IsAssignableTo(typeof(TInnerUow)))
                return (TInnerUow)innerUnitOfWork;
            else if (innerUnitOfWork.InnerUnitOfWorks.Any())
                foreach (var innerUnitOfWorkLevel2 in innerUnitOfWork.InnerUnitOfWorks)
                {
                    var innerUnitOfWorkLevel2FirstMatched =
                        innerUnitOfWorkLevel2.FindFirstInnerUowOfType<TInnerUow>();
                    if (innerUnitOfWorkLevel2FirstMatched != null)
                        return innerUnitOfWorkLevel2FirstMatched;
                }

        return null;
    }
}
