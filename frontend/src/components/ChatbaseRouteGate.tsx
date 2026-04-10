import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { installChatbaseEmbed, tryCloseChatbaseWidget } from '../lib/chatbaseEmbed';

const ADMIN_BODY_CLASS = 'pg-admin-no-chatbase';

function isAdminPath(pathname: string): boolean {
  return pathname === '/admin' || pathname.startsWith('/admin/');
}

/** Chatbase on public and donor-facing routes only; hidden on all `/admin` staff pages. */
export function ChatbaseRouteGate() {
  const { pathname } = useLocation();

  useEffect(() => {
    const admin = isAdminPath(pathname);
    document.body.classList.toggle(ADMIN_BODY_CLASS, admin);

    if (admin) {
      tryCloseChatbaseWidget();
      return;
    }

    installChatbaseEmbed();
  }, [pathname]);

  useEffect(
    () => () => {
      document.body.classList.remove(ADMIN_BODY_CLASS);
    },
    [],
  );

  return null;
}
