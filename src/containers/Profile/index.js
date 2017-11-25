import { connect } from 'react-redux';
import React, { Component } from 'react';
import CopyToClipboard from 'react-copy-to-clipboard';

import ToggleSwitch from 'react-toggle-switch';
import Dropzone from 'react-dropzone';

import {
  saveProfile,
  fetchAccounts,
  setLocation,
  findSession,
  fetchOrders,
  saveSession
} from '../../actions';
import Input from '../../components/Input';
import Dropdown from '../../components/Dropdown';

class Profile extends Component {
  constructor(props) {
    super(props);
    this.state = {
      ...props,
      sessionIdPaths: [
        {
          os: 'OSX',
          browser: 'Chrome',
          path: '~/Library/Application Support/Google/Chrome/Default/Web Data',
        },
      ],
    };
  }

  componentDidMount() {
    this.props.setLocation(this.props.location);
  }

  shouldComponentUpdate(nextProps, nextState) {
    return JSON.stringify(this.props) !== JSON.stringify(nextProps)
      || JSON.stringify(this.state) !== JSON.stringify(nextState);
  }

  onSelectProducts = (value) => {
    const selectedProducts = value;
    this.setState(prevState => ({
      selectedProducts,
    }));
  }

  handleInputChange = (key, event) => {
    const session = event.target.value;
    console.log('session', session);
    console.log('state', this.state.session);
    this.setState(prevState => ({
      session: session,
    }));
  }

  handleToggle = () => {
    this.setState(prevState => ({
      live: !prevState.live,
    }));
  }

  handleSave = (event) => {
    event.preventDefault();
    this.props.saveProfile({
      live: this.state.live,
      selectedProducts: this.state.selectedProducts,
    });
    // if session id exists, fetch private data
    if (this.state.session.length > 0) {
      this.props.fetchAccounts(this.state.session).then(res => {
        if (res) this.props.saveSession(this.state.session);
      })
      for (let i = 0; i < this.state.selectedProducts.length; i += 1) {
        this.props.fetchOrders(this.state.selectedProducts[i].value, this.state.session);
      }
    }
  }

  handleFindSession = (acceptedFiles) => {
    this.props.findSession(acceptedFiles);
  }

  render() {
    console.log('rendering profile container');
    return (
      <div className="container secondary-bg-dark">
        <div className="columns">
          <form className="form-horizontal col-mx-auto col-6" onSubmit={this.props.onSaveClick}>
            <div className="form-group">
              <button type="submit" className="col-3 col-mx-auto btn btn-primary" onClick={this.handleSave}>
                Save
              </button>
            </div>
            <div className="form-group">
              <label className="col-1" htmlFor="live">Live</label>
              <div className="col-11">
                <ToggleSwitch
                  className=""
                  on={this.state.live}
                  onClick={this.handleToggle}
                />
              </div>
            </div>
            <div className="form-group">
              <label className="col-2" htmlFor="session">Session</label>
              <Input
                className="col-10"
                name="session"
                placeholder="Session"
                value={this.state.session}
                onChange={this.handleInputChange}
              />
            </div>
            <p className="col-12">
              {'Can\'t find your session ID? Session data is stored by your browser. You can upload browser data and the app will try to find your session.'}
            </p>
            <table className="col-12">
                <tbody>
                  <tr>
                    <th>OS</th>
                    <th>Browser</th>
                    <th>Path</th>
                  </tr>
                  {
                    this.state.sessionIdPaths.map(s => (
                      (
                        <tr key={s.os}>
                          <td>{s.os}</td>
                          <td>{s.browser}</td>
                          <td>{s.path}</td>
                          <td>
                            <CopyToClipboard onCopy={() => {}} text={s.path} >
                              <button className="btn" onClick={(e) => { e.preventDefault(); }}>
                                Copy
                              </button>
                            </CopyToClipboard>
                          </td>
                        </tr>
                      )
                    ))
                  }
                </tbody>
            </table>
            <div className="form-group col-12">
              <button type="submit" className="btn" onClick={(e) => { e.preventDefault(); }}>
                <Dropzone className="dropzone" onDrop={this.handleFindSession}>
                  Find Session
                </Dropzone>
              </button>
            </div>
            <div className="form-group">
              <label className="col-2" htmlFor="watched-products">Watched Products</label>
              <Dropdown
                className="col-10"
                multi
                simpleValue
                options={this.props.products}
                onChange={this.onSelectProducts}
                value={this.state.selectedProducts}
              />
            </div>
          </form>
        </div>
      </div>
    );
  }
}

const mapStateToProps = state => (
  {
    products: state.chart.products ? state.chart.products.map(p => ({ label: p.display_name, value: p.id })) : [],
    ...state.profile,
  }
);

const mapDispatchToProps = dispatch => (
  {
    saveProfile: (settigns) => {
      dispatch(saveProfile(settigns));
    },
    setLocation: (location) => {
      dispatch(setLocation(location));
    },
    findSession: (acceptedFiles) => {
      dispatch(findSession(acceptedFiles));
    },
    fetchAccounts: (session) => (
      dispatch(fetchAccounts(session))
    ),
    fetchOrders: (product, session) => {
      dispatch(fetchOrders(product, session));
    },
    saveSession: (session) => {
      dispatch(saveSession(session));
    }
  }
);

export default connect(
  mapStateToProps,
  mapDispatchToProps,
)(Profile);
