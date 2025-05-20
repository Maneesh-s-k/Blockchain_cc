import React from 'react';
import Logo from './logo';
import './Background.css';
import './Logo.css';

const Background = () => {
  return (
    <div className="background">
      <Logo/>
      <div className="background-text">
        <h1>To a</h1>
        <h1>Better Future</h1>
      </div>
    </div>
  );
};

export default Background;
