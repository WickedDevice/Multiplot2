import { Multiplot2Page } from './app.po';

describe('multiplot2 App', () => {
  let page: Multiplot2Page;

  beforeEach(() => {
    page = new Multiplot2Page();
  });

  it('should display welcome message', () => {
    page.navigateTo();
    expect(page.getParagraphText()).toEqual('Welcome to app!');
  });
});
