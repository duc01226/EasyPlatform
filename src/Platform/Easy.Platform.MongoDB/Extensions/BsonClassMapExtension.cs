using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using MongoDB.Bson.Serialization;

namespace Easy.Platform.MongoDB.Extensions
{
    public static class BsonClassMapExtension
    {
        /// <summary>
        /// Register ClassMap If Not Registered
        /// </summary>
        public static void TryRegisterClassMap<TClassMap>(Action<BsonClassMap<TClassMap>> classMapInitializer)
        {
            if (!BsonClassMap.IsClassMapRegistered(typeof(TClassMap)))
            {
                BsonClassMap.RegisterClassMap(classMapInitializer);
            }
        }
    }
}
