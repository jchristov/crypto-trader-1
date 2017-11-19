import axios from 'axios';
import * as actionType from './actionTypes';
import { getAccounts, getProductData, getProducts } from '../utils/api';
import { INIT_RANGE, INIT_GRANULARITY } from '../utils/constants';
import { round } from '../utils/math';
import connect, { setActions, subscribe } from '../utils/websocket';

let nextScriptId = 2;

// profile
export const importProfile = userData => ({ type: actionType.IMPORT_PROFILE, userData });
export const saveProfile = settings => ({ type: actionType.SAVE_PROFILE, settings });
export const saveSession = session => ({ type: actionType.SAVE_SESSION, session });
export const updateAccounts = accounts => ({ type: actionType.UPDATE_ACCOUNTS, accounts });
export const addOrder = (id, productId, time, price) => ({ type: actionType.ADD_ORDER, id, productId, time, price });

// websocket
export const setProductWSData = (id, data) => ({ type: actionType.SET_PRODUCT_WS_DATA, id, data });
export const addProductWSData = data => ({ type: actionType.ADD_PRODUCT_WS_DATA, data });

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
export const fetchAccounts = session => (
  dispatch => (
    getAccounts(session).then((accounts) => {
      if (accounts) dispatch(updateAccounts(accounts));
    })
  )
);

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

const handleMatch = dispatch => {
  return data => {
    dispatch(addProductWSData(data));
  }
}

const transformOrderData = order => {
  return {
    price: round(parseFloat(order[0]), 2),
    size: round(parseFloat(order[1]), 10),
  }
}

const handleSnapshot = dispatch => {
  return data => {
    // console.log('actions/index.js handleSnapshot', data);
    let bids = [];
    for (let i = 0; i < data.bids.length; i +=1 ) {
      if (bids.length > 0 && bids[bids.length - 1][0] === data.bids[i][0]) {
        bids[bids.length - 1].size += round(parseFloat(data.bids[i][1]));
      } else if (parseFloat(data.bids[i][1]) > 0) {
        bids.push(transformOrderData(data.bids[i]));
      }
    }
    let asks = [];
    for (let i = 0; i < data.asks.length; i +=1 ) {
      if (asks.length > 0 && asks[asks.length - 1][0] === data.asks[i][0]) {
        asks[asks.length - 1].size += round(parseFloat(data.asks[i][1]));
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

export const initWebsocket = ids => (
  dispatch => (
    connect().then(() => {
      // handleMatch, handleSnapshot, handleUpdate
      setActions(handleMatch(dispatch), handleSnapshot(dispatch), handleUpdate(dispatch));
      subscribe(ids);
    })
  )
);

export const initProducts = () => (
  (dispatch, getState) => (
    getProducts().then((products) => {
      dispatch(setProducts(products.data));
      const selectedProductIds = getState().profile.selectedProducts.map(p => (p.value));
      dispatch(selectProduct(selectedProductIds[0]));
      dispatch(fetchProductData(selectedProductIds[0], INIT_RANGE, INIT_GRANULARITY));
      dispatch(initWebsocket([selectedProductIds[0]]));
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
