import axios from 'axios';
import * as actionType from './actionTypes';
import { getAccounts, getOrders, getProductData, getProducts, deleteOrder, postLimitOrder } from '../utils/api';
import { INIT_RANGE, INIT_GRANULARITY } from '../utils/constants';
import connect, { setActions, subscribeToTicker, subscribeToOrderBook } from '../utils/websocket';

let nextScriptId = 2;

// profile
export const importProfile = userData => ({ type: actionType.IMPORT_PROFILE, userData });
export const saveProfile = settings => ({ type: actionType.SAVE_PROFILE, settings });
export const saveSession = session => ({ type: actionType.SAVE_SESSION, session });
export const updateAccounts = accounts => ({ type: actionType.UPDATE_ACCOUNTS, accounts });
export const addOrder = (id, productId, time, price) => ({ type: actionType.ADD_ORDER, id, productId, time, price });
export const setOrders = (product, orders) => ({ type: actionType.SET_ORDERS, product, orders});
export const addActiveOrder = (productId, order) => ({ type: actionType.ADD_ACTIVE_ORDER, productId, order});
export const deleteActiveOrder = (productId, orderId) => ({ type: actionType.DELETE_ACTIVE_ORDER, productId, orderId});

// websocket
export const setProductWSData = (id, data) => ({ type: actionType.SET_PRODUCT_WS_DATA, id, data });
export const addProductWSData = data => ({ type: actionType.ADD_PRODUCT_WS_DATA, data });
export const setTickerWSData = data => ({type: actionType.SET_TICKER_WS_DATA, data});

// dashboard: charts
export const setProducts = products => ({ type: actionType.SET_PRODUCTS, products });
export const selectProduct = id => ({ type: actionType.SELECT_PRODUCT, id });
export const setProductData = (id, data) => ({ type: actionType.SET_PRODUCT_DATA, id, data });
export const addProductData = (id, data) => ({ type: actionType.ADD_PRODUCT_DATA, id, data });
export const selectDateRange = (id, range) => ({ type: actionType.SELECT_DATE_RANGE, id, range });
export const setGranularity = (id, granularity) =>
  ({ type: actionType.SET_GRANULARITY, id, granularity });
export const selectIndicator = id => ({ type: actionType.SELECT_INDICATOR, id });
export const editIndicator = indicator => ({ type: actionType.EDIT_INDICATOR, indicator });
export const setOrderBook = (id, orderBook) =>
  ({ type: actionType.SET_ORDER_BOOK, id, orderBook });
  export const updateOrderBook = (id, changes) =>
  ({ type: actionType.UPDATE_ORDER_BOOK, id, changes });
export const updateHeartbeat = status => ({ type: actionType.UPDATE_HEARTBEAT, status });
export const setFetchingStatus = status => ({ type: actionType.SET_FETCHING_STATUS, status });
export const calculateIndicators = id => ({ type: actionType.CALCULATE_INDICATORS, id });

// dashpbard: scratchpad
export const addScript = () => ({ type: actionType.ADD_SCRIPT, id: nextScriptId += 1 });
export const writeScript = script => ({ type: actionType.SAVE_SCRIPT, script });
export const deleteScript = id => ({ type: actionType.DELETE_SCRIPT, id });
export const selectScript = id => ({ type: actionType.SELECT_SCRIPT, id });
export const selectProductDoc = id => ({ type: actionType.SELECT_PRODUCT_DOC, id });
export const toggleScriptLive = id => ({ type: actionType.TOGGLE_SCRIPT_LIVE, id });
export const saveTestResult = result => ({ type: actionType.SAVE_TEST_RESULT, result });

export const saveScript = script => (
  dispatch => (
    new Promise((resolve) => {
      dispatch(writeScript(script));
      resolve();
    })
  )
);

// logging
export const appendLog = log => ({ type: actionType.APPEND_LOG, log });
export const clearLog = () => ({ type: actionType.CLEAR_LOG });

// location
export const setLocation = location => ({ type: actionType.SET_LOCATION, location });

// cards
export const showCard = (card, content) => ({ type: actionType.SHOW_CARD, card, content });

// api
export const placeLimitOrder = (appOrderType, side, productId, price, amount) => {
  return (dispatch, getState) => {
    const state = getState();
    const sessionId = getState().profile.session;
    if (appOrderType === 'bestPrice' || appOrderType === 'activeBestPrice') {
      const productWSData = state.websocket.products.find(wsProduct => wsProduct.id === productId);
      console.log('placeLimitOrder index.js ln 77', state, productWSData);
      if (side === 'buy') {
        //match highest bid price, first bid.price
        price = productWSData.bids[0].price;
      } else if (side ==='sell') {
        // match lowest ask price, last ask.price
        price = productWSData.asks[productWSData.asks.length - 1].price;
      }
    }
    return postLimitOrder(side, productId, price, amount, sessionId).then(res => {
      console.log('order response', res);
      // add order id to watched order id list, to replace order when needed
      dispatch(fetchOrders(productId, sessionId));
      if (res && appOrderType === 'activeBestPrice') {
        dispatch(addActiveOrder(res.product_id, res));
      }
      return res;
    });
  }
}

export const cancelOrder = order => (
  (dispatch, getState) => {
    const sessionId = getState().profile.session;
    return deleteOrder(order.id, sessionId).then(() => {
      // console.log('delete order request completed');
      // console.log(order);
      dispatch(deleteActiveOrder(order.product_id, order.id));
      dispatch(fetchOrders(order.product_id, sessionId));
    })
  }
);

export const fetchAccounts = session => (
  dispatch => (
    getAccounts(session).then((accounts) => {
      if (accounts) {
        dispatch(updateAccounts(accounts));
        return true;
      }
      return false;
    })
  )
);

export const fetchOrders = (product, session) => {
  return dispatch => {
    return getOrders(product, session).then((orders) => {
      // console.log('fetch order res', orders);
      dispatch(setOrders(product, orders));
    })
  };
}

export const fetchProductData = (id, range, granularity) => (
  (dispatch) => {
    dispatch(setFetchingStatus('fetching'));
    return getProductData(id, range, granularity).then((data) => {
      dispatch(setProductData(id, data));
      dispatch(setFetchingStatus('success'));
    }).catch((err) => {
      console.warn(err);
      dispatch(setFetchingStatus('failure'));
    });
  }
);

export const initProducts = () => (
  (dispatch, getState) => (
    getProducts().then((products) => {
      dispatch(setProducts(products.data));
      const state = getState();
      const session = state.profile.session;
      const selectedProductIds = state.profile.selectedProducts.map(p => (p.value));
      dispatch(selectProduct(selectedProductIds[0]));
      dispatch(fetchProductData(selectedProductIds[0], INIT_RANGE, INIT_GRANULARITY));
      if (session) {
        dispatch(fetchOrders(selectedProductIds[0], session));
        dispatch(fetchAccounts(session));
      }
      dispatch(initWebsocket(selectedProductIds));
    })
  )
);

export const fetchSettings = acceptedFiles => (
  dispatch => (
    axios.create({ baseURL: '' }).get(acceptedFiles[0].preview).then((res) => {
      dispatch(importProfile(res.data));
      return res.data;
    })
  )
);

export const findSession = acceptedFiles => (
  dispatch => (
    axios.create({ baseURL: '' }).get(acceptedFiles[0].preview).then((res) => {
      const content = res.data;
      const key = 'session';
      const idLength = 64;
      const re = new RegExp('^[a-z0-9]+$');
      const sessionLocations = [];
      let index = 0;

      // get indexs of key
      while (index < content.length) {
        index = content.indexOf(key, index);
        sessionLocations.push(index);
        if (index === -1) break;
        index += 1;
      }

      // get string os idLength past the key positions then filter strings with non-alpha-num chars
      const sessions = sessionLocations.map(s => (
        content.substring(s + key.length, s + key.length + idLength)
      )).filter(s => (
        re.test(s)
      ));

      // call accounts api with remainng session ids
      for (let i = 0; i < sessions.length; i += 1) {
        getAccounts(sessions[i]).then((accounts) => {
          if (accounts) {
            dispatch(saveSession(sessions[i]));
            dispatch(updateAccounts(accounts));
          }
        });
      }
    })
  )
);

/*
 * Websocket
*/

const handleMatch = dispatch => {
  return data => {
    dispatch(addProductWSData(data));
  }
}

const transformOrderData = order => {
  return {
    price: parseFloat(order[0]).toFixed(2),
    size: parseFloat(order[1]).toFixed(8),
  }
}

const handleSnapshot = dispatch => {
  return data => {
    // console.log('actions/index.js handleSnapshot', data);
    let bids = [];
    for (let i = 0; i < data.bids.length; i +=1 ) {
      if (bids.length > 0 && bids[bids.length - 1][0] === data.bids[i][0]) {
        bids[bids.length - 1].size += parseFloat(data.bids[i][1]).toFixed(8);
      } else if (parseFloat(data.bids[i][1]) > 0) {
        bids.push(transformOrderData(data.bids[i]));
      }
    }
    let asks = [];
    for (let i = 0; i < data.asks.length; i +=1 ) {
      if (asks.length > 0 && asks[asks.length - 1][0] === data.asks[i][0]) {
        asks[asks.length - 1].size += parseFloat(data.asks[i][1]).toFixed(8);
      } else if (parseFloat(data.asks[i][1]) > 0) {
        asks.push(transformOrderData(data.asks[i]));
      }
    }
    dispatch(setOrderBook(data.product_id, { bids: bids, asks: asks }))
  }
}

const handleUpdate = dispatch => {
  return data => {
    // console.log('actions/index.js handleUpdate', data);
    dispatch(updateOrderBook(data.product_id, data.changes))
  }
}

const handleTicker = dispatch => {
  return data => {
    dispatch(setTickerWSData(data))
  }
}

const handleDeleteOrder = (dispatch, sessionId) => {
  return data => {
    dispatch(deleteActiveOrder(data.product_id, data.id));
    dispatch(fetchOrders(data.product_id, sessionId));
  }
}


export const initWebsocket = ids => (
  (dispatch, getState) => (
    connect().then(() => {
      const sessionId = getState().profile.session;
      // pass in methods that the WS will need to call.
      setActions(handleMatch(dispatch), handleSnapshot(dispatch), handleUpdate(dispatch), handleTicker(dispatch), handleDeleteOrder(dispatch, sessionId));
      subscribeToTicker(ids)
      subscribeToOrderBook(ids[0], sessionId);
    })
  )
);
