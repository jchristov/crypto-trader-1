import React from 'react';
import { render } from 'react-dom';
import { BrowserRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { createStore /* compose */ } from 'redux';
// import { persistStore, autoRehydrate } from 'redux-persist';

import 'react-select/dist/react-select.css';
import 'react-toggle-switch/dist/css/switch.min.css';
import App from './App';
import reducer from './reducers';
// import registerServiceWorker from './registerServiceWorker';

import './index.scss';


const store = createStore(
  reducer,
  window.__REDUX_DEVTOOLS_EXTENSION__ && window.__REDUX_DEVTOOLS_EXTENSION__(),
  // compose(
  //   autoRehydrate()
  // )
);

// persistStore(store)

render(
  <Provider store={store}>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </Provider>,
  document.getElementById('root'));
// registerServiceWorker();