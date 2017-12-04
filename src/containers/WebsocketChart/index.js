import { connect } from 'react-redux';
import React, { Component } from 'react';

import LineChart from '../../components/LineChart';
import Loader from '../../components/Loader';
import ConnectedGlyph from '../../components/ConnectedGlyph';

class WebsocketChart extends Component {

  // return false, do update with child chart API via ref
  shouldComponentUpdate(nextProps) {
    if(this.lineChart && this.lineChart.wschart) {
      const chart = this.lineChart.wschart.getChart();
      const nextConfig = this.wsConfig(nextProps);
      if (this.dataChanged(nextConfig)) {
        for (let i = 0; i < chart.series.length; i += 1) {
          if (nextConfig.series[i]) {
            chart.series[i].update({
              name: nextConfig.series[i].name,
              data: nextConfig.series[i].data,
            });
          }
        }
      }
    }
    return (this.props.websocketPriceData.length === 0 && nextProps.websocketPriceData.length > 0) || this.props.visible !== nextProps.visible
      || this.props.connected !== nextProps.connected;
  }

  dataChanged = (nextConfig) => {
    const lastConfig = this.wsConfig(this.props);
    for (let i = 0; i < nextConfig.series.length; i += 1) {
      if (lastConfig.series[i]) {
        // if start data, last data, or name is not equal to previous
        const lastIndex = nextConfig.series[i].data.length - 1;
        const earliestDataChanged = JSON.stringify(lastConfig.series[i].data[0])
          !== JSON.stringify(nextConfig.series[i].data[0]);
        const latestDataChanged = JSON.stringify(lastConfig.series[i].data[lastIndex])
          !== JSON.stringify(nextConfig.series[i].data[lastIndex]);
        const nameChanged = JSON.stringify(lastConfig.series[i].name)
          !== JSON.stringify(nextConfig.series[i].name);
        if (earliestDataChanged || latestDataChanged || nameChanged) {
          return true;
        }
      }
    }
    return false;
  }

  wsConfig = (props) => {
    return {
      plotOptions: {
        line: {
          marker: { enabled: false },
        }
      },
      rangeSelector: {
        enabled: false,
      },
      credits: {
        enabled: false,
      },
      title:{
        text: null
      },
      legend: {
        enabled: false,
      },
      chart: {
        backgroundColor: 'transparent',
      },
      tooltip: {
        enabled: false,
      },
      xAxis: [{
        type: 'datetime',
        title: { text: null },
        labels: {
          y: 13,
          style: {
            color: 'white',
          },
        },

        tickInterval: props.granularity * 10,
        tickLength: 3,
      }],
      yAxis: [{
        gridLineColor: 'transparent',
        title: { text: null },
        labels: {
          align: 'right',
          x: -5,
          style: {
            color: 'white',
          },
        },
        opposite: true,
        lineWidth: 1,
      },
      {
        gridLineColor: 'transparent',
        title: { text: null },
        labels: {
          enabled: false,
        },
        top: '85%',
        height: '15%',
        offset: 0,
        lineWidth: 1,
      }],
      series: [{
        animation: false,
        data: props.websocketPriceData,
        type: 'line',
        name: props.productId,
        tooltip: {
          valueDecimals: 2,
        },
      },
      {
        animation: false,
        type: 'column',
        name: 'Volume',
        data: props.websocketVolumeData,
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
  }

  render() {
   //  console.log('rendering WebsocketChart');
    return ( this.props.visible &&
      <div className="chart secondary-bg-dark">
        <ConnectedGlyph connected={this.props.connected}/>
        { this.props.websocketPriceData.length > 0 ?
          <div className="">
            <LineChart ref={(c) => { this.lineChart = c; }} refName="wschart" config={this.wsConfig(this.props)} />
          </div>
          : <div className="loading-message">
            <Loader />
            <p className="message">{`Chart will render when realtime data is received for
              ${this.props.productDisplayName ? this.props.productDisplayName : 'the selected product'}`}</p>
          </div>
        }
      </div>
    );
  }
}


const mapStateToProps = state => {
  const selectedProduct = state.profile.products.find(p => {
    return p.active;
  });
  const selectedWebsocket = state.websocket.products.find(p => {
    return p.id === selectedProduct.id;
  });
  const productId = selectedProduct.id;

  const productDisplayName = selectedProduct.label;

  const websocketPriceData =  selectedWebsocket && selectedWebsocket.data ?
      selectedWebsocket.data.map(d => ([d.time, d.price])) : [];

  const websocketVolumeData = selectedWebsocket && selectedWebsocket.data ?
      selectedWebsocket.data.map(d => ([d.time, d.size])) : [];

  const selectedProductData = state.chart.products.find(p => {
    return p.id === selectedProduct.id;
  });

  const historicalData = selectedProductData && selectedProductData.data ? selectedProductData.data : [];

  const granularity = selectedProductData ? selectedProductData.granularity : null ;

  const connected = state.websocket.connected;

  const content = 'Price';
  const visible = state.view.topCenter.find(c => (c.id === content)).selected;

  return ({
    productId,
    productDisplayName,
    websocketPriceData,
    websocketVolumeData,
    historicalData,
    granularity,
    connected,
    visible,
  })
};


const WebsocketChartContainer = connect(
  mapStateToProps,
  null,
)(WebsocketChart);

export default WebsocketChartContainer;