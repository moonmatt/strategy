class Transition{
    setup(duration){
     this.duration = duration || 500;
     const style = document.createElement('style');
     style.innerHTML = `
      transition{
       width: 100vw;
       height: 100vh;
       position: fixed;
       top: 0;
       left: 0;
       bottom: 0;
       right: 0;
       background-color: #ffffff;
       opacity: 1;
       animation: transition ${this.duration}ms linear 1 0s forwards;
      }
   
      @keyframes transition{
       0%{
        opacity: 0
       }
       50%{
        opacity: 0.5
       }
       100%{
        opacity: 0;
       }
      }
     `;
     document.body.appendChild(style);
    }
    perform(){
     const transition = document.createElement('transition');
     document.body.appendChild(transition);
     setTimeout(() => transition.remove(), this.duration);
    }
   }
   
   const transition = new Transition();
   transition.setup();