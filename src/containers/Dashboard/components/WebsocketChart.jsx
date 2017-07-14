import React, { Component } from 'react';
import PropTypes from 'prop-types';

import LineChart from '../../../components/LineChart';
import Loader from '../../../components/Loader';

export default class WebsocketChart extends Component {

  componentWillReceiveProps = (nextProps) => {
    // console.log('will receive props');
    if (false) {
      const product = this.selectedProduct(nextProps.products);
      // get procut historical data
      const data = product.data ? [...product.data] : [];
      // get time of newest product historical data
      const newestdatatime = data[data.length - 1] && data[data.length - 1].time ?
        data[data.length - 1].time : null;

      // get all web socket data for product
      let wsData = this.productById(nextProps.websocket.products, product.id).data;

      if (wsData.length > 0) {
        // get time of oldest and newest web socket data
        const newestwsdatatime = wsData[wsData.length - 1].time;
        // add compiled ws data to historical data
        if (newestwsdatatime - newestdatatime >= product.granularity * 1000) {
          // filter out data older than granularity time
          wsData = wsData.filter(d => (
            (newestwsdatatime - d.time < product.granularity * 1000)
          ));
          this.props.setProductWSData(wsData);

          // comile ws data to OHLC data
          wsData.reduce((ohlc, d) => (
            {
              ...ohlc,
              high: d.price > ohlc.high ? d.price : ohlc.high,
              low: d.price < ohlc.low ? d.price : ohlc.low,
              volume: d.size + ohlc.volume,
            }
          ), {
            open: wsData[0].price,
            high: Number.MIN_SAFE_INTEGER,
            low: Number.MAX_SAFE_INTEGER,
            close: wsData[wsData.length - 1].price,
            time: newestwsdatatime,
            volume: 0,
          });
          this.props.setProductData(data);
        }
      }
    }
  }

  shouldComponentUpdate = (nextProps) => {
    const a = this.websocketDataChanged(this.props.websocket.products, nextProps.websocket.products);
    return a;
  }

  websocketDataChanged = (now, next) => {
    const nowProds = [...now];
    const nextPords = [...next];
    const selectedProduct = nowProds.reduce((a, p) => (p.active ? p : a), { id: '', data: [] });
    const nextSelectedProduct = nextPords.reduce((a, p) => (p.active ? p : a), { id: '', data: [] });
    return (nextSelectedProduct.id !== selectedProduct.id) ||
      (nextSelectedProduct.data.length !== selectedProduct.data.length) ||
      JSON.stringify(nextSelectedProduct.data) !== JSON.stringify(selectedProduct.data);
  }

  productById = (products, id) => (
    products.reduce((a, b) => (
      b.id === id ? b : a
    ), {})
  )

  selectedProduct = products => (
    products.length > 0 ?
      products.reduce((a, p) => (p.active ? p : a), { id: '', data: [] }) : { id: '', data: [] }
  )

  render() {
    // console.log(this.props);
    const selectedProduct = this.selectedProduct(this.props.websocket.products);

    const selectedProductWSPriceData = selectedProduct.data ?
      selectedProduct.data.map(d => ([d.time, d.price])) : [];

    const selectedProductWSVolumeData = selectedProduct.data ?
      selectedProduct.data.map(d => ([d.time, d.size])) : [];

    console.log(selectedProductWSPriceData);

    const wsConfig = {
      yAxis: [{
        labels: {
          align: 'right',
          x: -3,
        },
        height: '114%',
        top: '-14%',
        lineWidth: 2,
      },
      {
        labels: {
          align: 'right',
          x: -3,
        },
        top: '85%',
        height: '15%',
        offset: 0,
        lineWidth: 2,
      }],
      series: [{
        data: selectedProductWSPriceData,
        type: 'line',
        name: 'Price',
        tooltip: {
          valueDecimals: 2,
        },
      },
      {
        type: 'column',
        name: 'Size',
        data: selectedProductWSVolumeData,
        yAxis: 1,
      }],
      navigator: {
        enabled: false,
      },
      scrollbar: {
        enabled: false,
      },
      pane: {
        background: {
          borderWidth: 0,
        },
      },
    };

    return (
      <div className="websocket-chart">
        { selectedProduct.data && selectedProduct.data.length > 0 ?
          <div>
            <LineChart config={wsConfig} />
          </div>
          : <div>
            <Loader />
          </div>
        }
      </div>
    );
  }
}
