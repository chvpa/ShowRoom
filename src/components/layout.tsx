
import React from 'react';
import Sidebar from './sidebar';
import Header from './header';

type LayoutProps = {
  children: React.ReactNode;
  activePage?: string;
};

const Layout = ({ children, activePage = "catalog" }: LayoutProps) => {
  return (
    <div className="min-h-screen bg-background">
      <Sidebar activePage={activePage} />
      <div className="pl-64">
        <Header />
        <main className="min-h-[calc(100vh-64px)]">
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;
