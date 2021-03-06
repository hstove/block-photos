import React from 'react';
import ReactDOM from 'react-dom';
import BlockImg from './BlockImg';

import * as blockstack from 'blockstack';

jest.mock('blockstack');

it('renders without crashing', () => {
  const mockResponse = 'base64mumbojumbo';
  blockstack.getFile.mockReturnValue(Promise.resolve(mockResponse));

  const div = document.createElement('div');
  ReactDOM.render(
    <BlockImg id="fakeimg.png" />
  , div);
  ReactDOM.unmountComponentAtNode(div);
});
