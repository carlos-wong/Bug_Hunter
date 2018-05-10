// import { Menu, Dropdown, Icon, SubMenu } from 'antd';
var antd = require('antd');
var React = require('react');
var ReactDOM = require('react-dom');
var SimpleMDEReact = require('react-simplemde-editor');
var Editor = require('./markdown/Editor');
var createReactClass = require('create-react-class');
// import React, { Component, ReactDOM } from 'react';


const Cascader = antd.Cascader

let counter = 1;

const options = [{
    value: 'zhejiang',
    label: 'Zhejiang',
    children: [{
      value: 'hangzhou',
      label: 'Hangzhou',
      children: [{
        value: 'xihu',
        label: 'West Lake',
      }],
    }],
  }, {
    value: 'jiangsu',
    label: 'Jiangsu',
    children: [{
      value: 'nanjing',
      label: 'Nanjing',
      children: [{
        value: 'zhonghuamen',
        label: 'Zhong Hua Men',
      }],
    }],
  }];

function onChange(value) {
  console.log(value);
}


module.exports = createReactClass({

  getInitialState() {
    return {
      textValue1: "I am the initial value. Erase me, or try the button above.",
      textValue2: "Focus this text area and then use the Up and Down arrow keys to see the `extraKeys` prop in action"
    }
  },

  extraKeys() {
    return {
      Up: function(cm) {
        cm.replaceSelection(" surprise. ");
      },
      Down: function(cm) {
        cm.replaceSelection(" surprise again! ");
      }
    };
  },

  handleChange1(value) {
    this.setState({
      textValue1: value
    });
  },

  handleChange2(value) {
    this.setState({
      textValue2: value
    });
  },

  handleTextChange() {
    this.setState({
      textValue1: `Changing text by setting new state. ${counter++}`
    });
  },

  render() {
    return (
      <div className='container container-narrow'>
        <div className="page-header">
          <h1>
            <a href="https://github.com/benrlodge/react-simplemde-editor">Test case editor</a>
          </h1>
        </div>

        <button style={{display: "inline-block", margin: "10px 0"}} onClick={this.handleTextChange}>
          Reset
        </button>
        <button style={{display: "inline-block", margin: "10px 0"}} onClick={this.handleTextChange}>
          Confirm
        </button>
        
        <Cascader options={options} onChange={onChange} placeholder="Please select" />

        <Editor
          label="Markdown Editor"
          value={this.state.textValue1}
          handleEditorChange={this.handleChange1}
        />

        <hr />
      </div>
    )
  }
});

/*
import React, { Component,ReactDOM } from 'react';
// const ReactDOM = require('react-dom')
const ReactMarkdown = require('react-markdown')

const input = '# This is a header\n\nAnd this is a paragraph'

class AddTestCase extends Component {
    render() {
        console.log('dump props is:',this.props.match.params);
        return (
            <div>
              <ReactMarkdown source={input} />
            </div>
        );
    }
}

export default AddTestCase;

*/
