import React from 'react';
import { act, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MemoryRouter } from 'react-router-dom';
import Navbar from '../components/Navbar';

jest.mock('../hooks/useAuth', () => ({ useAuth: () => ({ user: null }) }));

test('feed header hides further down, returns on upward scroll, and stays visible at the top', () => {
  const previousHeight = Object.getOwnPropertyDescriptor(document.documentElement, 'scrollHeight');
  const previousY = Object.getOwnPropertyDescriptor(window, 'scrollY');
  Object.defineProperty(document.documentElement, 'scrollHeight', { configurable: true, value: 4000 });
  let update: FrameRequestCallback | undefined;
  const raf = jest.spyOn(window, 'requestAnimationFrame').mockImplementation(callback => { update = callback; return 1; });
  const cancel = jest.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {});
  Object.defineProperty(window, 'scrollY', { configurable: true, value: 0 });
  const view = render(<MemoryRouter><Navbar /></MemoryRouter>);
  const scrollTo = (y: number) => act(() => {
    Object.defineProperty(window, 'scrollY', { configurable: true, value: y });
    window.dispatchEvent(new Event('scroll'));
    update?.(0);
  });
  try {
    scrollTo(500);
    expect(screen.getByRole('navigation')).toHaveClass('site-navbar--hidden');
    scrollTo(480);
    expect(screen.getByRole('navigation')).not.toHaveClass('site-navbar--hidden');
    scrollTo(900);
    expect(screen.getByRole('navigation')).toHaveClass('site-navbar--hidden');
    scrollTo(0);
    expect(screen.getByRole('navigation')).not.toHaveClass('site-navbar--hidden');
  } finally {
    view.unmount();
    raf.mockRestore(); cancel.mockRestore();
    if (previousHeight) Object.defineProperty(document.documentElement, 'scrollHeight', previousHeight);
    else delete (document.documentElement as any).scrollHeight;
    if (previousY) Object.defineProperty(window, 'scrollY', previousY);
  }
});
