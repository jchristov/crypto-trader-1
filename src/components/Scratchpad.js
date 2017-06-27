import React, { Component } from 'react'


function ExpandableButton(props){
  return (
    <div>
        <button className='list-group-item list-group-item-action' onClick={() => props.onClick(props.name)}>{props.name}</button>
        { props.active &&
          <div>
            <p>{props.desc}</p>
          </div>
        }
    </div>
  )
}

export default class Scratchpad extends Component {
  constructor(props) {
    super(props)
    this.state = {
      code: '',
      docs: [
        {
          name: 'btc',
          desc: 'Bitcoin price.\nparams: date: Date string in ISO_8601 format\nVale: Open, High, Low, Close',
          active: false
        }
      ]
    }
    this.handleChange = this.handleChange.bind(this)
    this.handleSubmit = this.handleSubmit.bind(this)
    this.handleVariableClick = this.handleVariableClick.bind(this)
  }

  handleChange = (event) => {
    event.preventDefault()
    this.setState({code: event.target.value});
  }

  handleSubmit = (event) => {
    event.preventDefault()
    try {
      eval(this.state.code)
      console.log('script is valid')
    }
    catch(err) {
        alert('Script is invalid. Must evaluate to true or false.\n\nMessage:\n\n' + err.message)
    }
  }

  handleVariableClick = (name) => {
    console.log('click' + name)
    this.setState((prevState) => {
      return {
        docs: prevState.docs.map( doc => {
          if(doc.name === name) {
            doc.active = !doc.active
          }
          return doc
        })
      }
    })
  }

  render() {
    return (
      <div>
        <div className='list-group col-md-3'>
          {
            this.state.docs.map(doc => (
              <ExpandableButton
                active={doc.active}
                desc={doc.desc}
                key={doc.name}
                name={doc.name}
                onClick={this.handleVariableClick}/>
            ))
          }
        </div>
        <div className='col-md-8'>
          <form onSubmit={this.handleSubmit}>
            <input
              className='btn btn-primary btn-save'
              type="submit"
              value="Save"
            />
            <textarea className='form-group col-md-12' rows={'3'} cols={'30'} value={this.state.code} onChange={this.handleChange} />
          </form>
        </div>
      </div>
    )
  }
}
