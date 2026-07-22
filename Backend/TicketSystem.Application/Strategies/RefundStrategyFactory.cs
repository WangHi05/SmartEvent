using System;
using TicketSystem.Application.Interfaces;
using TicketSystem.Domain.Common;

namespace TicketSystem.Application.Strategies
{
    public interface IRefundStrategyFactory
    {
        IRefundStrategy GetStrategy(RefundPolicy policy);
    }

    public class RefundStrategyFactory : IRefundStrategyFactory
    {
        private readonly IServiceProvider _serviceProvider;

        public RefundStrategyFactory(IServiceProvider serviceProvider)
        {
            _serviceProvider = serviceProvider;
        }

        public IRefundStrategy GetStrategy(RefundPolicy policy)
        {
            return policy switch
            {
                RefundPolicy.FullRefund => (IRefundStrategy)_serviceProvider.GetService(typeof(FullRefundStrategy))!,
                RefundPolicy.NoRefund => (IRefundStrategy)_serviceProvider.GetService(typeof(NoRefundStrategy))!,
                RefundPolicy.PartialRefund => (IRefundStrategy)_serviceProvider.GetService(typeof(PartialRefundStrategy))!,
                _ => (IRefundStrategy)_serviceProvider.GetService(typeof(PartialRefundStrategy))!
            };
        }
    }
}