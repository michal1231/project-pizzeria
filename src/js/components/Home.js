import { templates, select } from '../settings.js';

class Home {
  constructor(element) {
    const thisHome = this;

    thisHome.render(element);
    thisHome.initPlugin();
    thisHome.initPageChange();
  }

  render(wrapperDOM) {
    const thisHome = this;

    const generatedHTML = templates.homeWidget();

    thisHome.dom = {};
    thisHome.dom.wrapper = wrapperDOM;
    thisHome.dom.wrapper.innerHTML = generatedHTML;
    thisHome.dom.carousel = thisHome.dom.wrapper.querySelector(select.widgets.carousel);
    thisHome.dom.cardLinks = thisHome.dom.wrapper.querySelectorAll(select.home.cardLinks);
  }

  initPlugin() {
    const thisHome = this;

    // eslint-disable-next-line no-undef
    thisHome.flickityPlugin = new Flickity(thisHome.dom.carousel, {
      autoPlay: true,
      wrapAround: true,
      cellAlign: 'left',
      imagesLoaded: true,
      percentPosition: true,
    });
  }

  initPageChange() {
    const thisHome = this;

    for (let link of thisHome.dom.cardLinks) {
      link.addEventListener('click', function (event) {
        event.preventDefault();
        thisHome.changePage(event.target.getAttribute('href'));
      });
    }
  }

  changePage(clickedLink) {
    const thisHome = this;

    const event = new CustomEvent('change-page', {
      bubbles: true,
      detail: {
        link: clickedLink,
      },
    });

    thisHome.dom.wrapper.dispatchEvent(event);
  }
}


export default Home;