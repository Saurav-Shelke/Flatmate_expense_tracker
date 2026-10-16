import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { LoginPage } from '@/pages/LoginPage';
import { Shell, NavTab } from '@/components/layout/Shell';
import { DashboardPage } from '@/pages/DashboardPage';
import { ExpensesPage } from '@/pages/ExpensesPage';
import { PurchasesForMePage } from '@/pages/PurchasesForMePage';
import { CommonExpensesPage } from '@/pages/CommonExpensesPage';
import { BalancesPage } from '@/pages/BalancesPage';
import { RepaymentsPage } from '@/pages/RepaymentsPage';
import { ProfilePage } from '@/pages/ProfilePage';
import { Loader2 } from '@/components/ui/icons';

export function App() {
  const { user, loading } = useAuth();
  const [activeTab, setActiveTab] = useState<NavTab>('dashboard');
  const [selectedRepaymentTarget, setSelectedRepaymentTarget] = useState<string | undefined>();

  if (loading) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center bg-background text-foreground">
        <div className="flex items-center space-x-3">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <span className="text-sm font-medium text-muted-foreground">Loading Household Ledger...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  const navigateToRepayments = (targetMemberId?: string) => {
    setSelectedRepaymentTarget(targetMemberId);
    setActiveTab('repayments');
  };

  return (
    <Shell activeTab={activeTab} onTabChange={setActiveTab}>
      {activeTab === 'dashboard' && (
        <DashboardPage
          onNavigate={setActiveTab}
          onOpenVoice={() => {
            const event = new KeyboardEvent('keydown', { key: 'm', ctrlKey: true });
            window.dispatchEvent(event);
          }}
        />
      )}
      {(activeTab === 'expenses' || activeTab === 'personal') && (
        <ExpensesPage initialSubTab="personal" />
      )}
      {activeTab === 'purchases_made' && (
        <ExpensesPage initialSubTab="purchases_made" />
      )}
      {activeTab === 'purchases_for_me' && (
        <PurchasesForMePage onNavigateToRepayments={() => navigateToRepayments()} />
      )}
      {activeTab === 'common' && <CommonExpensesPage />}
      {activeTab === 'balances' && (
        <BalancesPage onNavigateToRepayments={navigateToRepayments} />
      )}
      {activeTab === 'repayments' && (
        <RepaymentsPage initialRecipientId={selectedRepaymentTarget} />
      )}
      {activeTab === 'profile' && <ProfilePage />}
    </Shell>
  );
}

export default App;
