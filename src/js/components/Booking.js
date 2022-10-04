import { templates, select, settings, classNames } from '../settings.js';
import AmountWidget from './AmountWidget.js';
import DatePicker from './DatePicker.js';
import HourPicker from './HourPicker.js';
import utils from '../utils.js';

class Booking {
  constructor(element) {
    const thisBooking = this;

    thisBooking.render(element);
    thisBooking.initWidgets();
    thisBooking.getData();
    thisBooking.initActions();
  }

  getData() {
    const thisBooking = this;

    const startDateParam = settings.db.dateStartParamKey + '=' + utils.dateToStr(thisBooking.datePickerWidget.minDate);
    const endDateParam = settings.db.dateEndParamKey + '=' + utils.dateToStr(thisBooking.datePickerWidget.maxDate);

    const params = {
      bookings: [
        startDateParam,
        endDateParam,
      ],
      eventsCurrent: [
        settings.db.notRepeatParam,
        startDateParam,
        endDateParam,
      ],
      eventsRepeat: [
        settings.db.repeatParam,
        endDateParam,
      ],
    };


    const urls = {
      bookings: settings.db.url + '/' + settings.db.booking + '?' + params.bookings.join('&'),
      eventsCurrent: settings.db.url + '/' + settings.db.event + '?' + params.eventsCurrent.join('&'),
      eventsRepeat: settings.db.url + '/' + settings.db.event + '?' + params.eventsRepeat.join('&'),
    };

    Promise.all([
      fetch(urls.bookings),
      fetch(urls.eventsCurrent),
      fetch(urls.eventsRepeat),
    ])
      .then(function (allResponses) {
        const bookingsResponse = allResponses[0];
        const eventsCurrentResponse = allResponses[1];
        const eventsRepeatResponse = allResponses[2];
        return Promise.all([
          bookingsResponse.json(),
          eventsCurrentResponse.json(),
          eventsRepeatResponse.json(),
        ]);
      })
      .then(function ([bookings, eventsCurrent, eventsRepeat]) {
        thisBooking.parseData(bookings, eventsCurrent, eventsRepeat);
      });
  }

  parseData(bookings, eventsCurrent, eventsRepeat) {
    const thisBooking = this;

    thisBooking.booked = {};

    for (let item of bookings) {
      thisBooking.makeBooked(item.date, item.hour, item.duration, item.table);
    }

    for (let item of eventsCurrent) {
      thisBooking.makeBooked(item.date, item.hour, item.duration, item.table);
    }

    const minDate = thisBooking.datePickerWidget.minDate;
    const maxDate = thisBooking.datePickerWidget.maxDate;

    for (let item of eventsRepeat) {
      if (item.repeat === 'daily') {
        for (let loopDate = minDate; loopDate <= maxDate; loopDate = utils.addDays(loopDate, 1)) {
          thisBooking.makeBooked(utils.dateToStr(loopDate), item.hour, item.duration, item.table);
        }
      }
    }

    thisBooking.updateDOM();
  }

  makeBooked(date, hour, duration, table) {
    const thisBooking = this;

    if (typeof (thisBooking.booked[date]) === 'undefined') {
      thisBooking.booked[date] = {};
    }

    const startHour = utils.hourToNumber(hour);

    for (let hourBlock = startHour; hourBlock < startHour + duration; hourBlock += 0.5) {
      if (typeof (thisBooking.booked[date][hourBlock]) === 'undefined') {
        thisBooking.booked[date][hourBlock] = [];
      }

      thisBooking.booked[date][hourBlock].push(table);
    }
  }

  updateDOM() {
    const thisBooking = this;

    thisBooking.date = thisBooking.datePickerWidget.value;
    thisBooking.hour = utils.hourToNumber(thisBooking.hourPickerWidget.value);

    let allAvailable = false;

    if (typeof thisBooking.booked[thisBooking.date] === 'undefined' || typeof thisBooking.booked[thisBooking.date][thisBooking.hour] === 'undefined') {
      allAvailable = true;
    }

    for (let table of thisBooking.dom.tables) {
      let tableId = table.getAttribute(settings.booking.tableIdAttribute);
      if (!isNaN(tableId)) {
        tableId = parseInt(tableId);
      }

      if (typeof thisBooking.booked[thisBooking.date][thisBooking.hour] !== 'undefined') {
        if (!allAvailable & thisBooking.booked[thisBooking.date][thisBooking.hour].includes(tableId)) {
          table.classList.add(classNames.booking.tableBooked);
        } else {
          table.classList.remove(classNames.booking.tableBooked);
        }
      } else {
        table.classList.remove(classNames.booking.tableBooked);
      }
    }

    if (thisBooking.checkAvailability() === false) {
      thisBooking.dom.hourPickerInput.classList.add(classNames.booking.colidingHour);
    } else {
      thisBooking.dom.hourPickerInput.classList.remove(classNames.booking.colidingHour);
    }
  }

  render(wrapperDOM) {
    const thisBooking = this;

    const generatedHTML = templates.bookingWidget();

    thisBooking.dom = {};
    thisBooking.dom.wrapper = wrapperDOM;
    thisBooking.dom.wrapper.innerHTML = generatedHTML;
    thisBooking.dom.peopleAmount = thisBooking.dom.wrapper.querySelector(select.booking.peopleAmount);
    thisBooking.dom.hoursAmount = thisBooking.dom.wrapper.querySelector(select.booking.hoursAmount);
    thisBooking.dom.datePicker = thisBooking.dom.wrapper.querySelector(select.widgets.datePicker.wrapper);
    thisBooking.dom.hourPicker = thisBooking.dom.wrapper.querySelector(select.widgets.hourPicker.wrapper);
    thisBooking.dom.tables = thisBooking.dom.wrapper.querySelectorAll(select.booking.tables);
    thisBooking.dom.floor = thisBooking.dom.wrapper.querySelector(select.booking.floor);
    thisBooking.dom.phone = thisBooking.dom.wrapper.querySelector(select.booking.phone);
    thisBooking.dom.address = thisBooking.dom.wrapper.querySelector(select.booking.address);
    thisBooking.dom.starters = thisBooking.dom.wrapper.querySelectorAll(select.booking.checkbox);
    thisBooking.dom.submit = thisBooking.dom.wrapper.querySelector(select.booking.bookingSubmit);
    thisBooking.dom.hourPickerInput = thisBooking.dom.hoursAmount.querySelector(select.booking.hoursAmountInput);
  }

  initWidgets() {
    const thisBooking = this;

    thisBooking.peopleAmountWidget = new AmountWidget(thisBooking.dom.peopleAmount);
    thisBooking.hoursAmountWidget = new AmountWidget(thisBooking.dom.hoursAmount);

    //thisBooking.dom.peopleAmount.addEventListener('updated', function () { });
    //thisBooking.dom.hoursAmount.addEventListener('updated', function () { });

    thisBooking.datePickerWidget = new DatePicker(thisBooking.dom.datePicker);
    thisBooking.hourPickerWidget = new HourPicker(thisBooking.dom.hourPicker);

    thisBooking.dom.wrapper.addEventListener('updated', function (event) {
      thisBooking.updateDOM();

      if (event.target === thisBooking.dom.hourPicker || event.target === thisBooking.dom.datePicker) {
        thisBooking.pickedTable = false;
        for (let table of thisBooking.dom.tables) {
          table.classList.remove(classNames.booking.pickedTable);
        }
      }

    });
  }

  checkAvailability() {
    const thisBooking = this;

    let availability = true;
    for (let hourBlock = thisBooking.hour; hourBlock < thisBooking.hour + thisBooking.hoursAmountWidget.value; hourBlock += 0.5) {
      if (hourBlock >= settings.hours.close) {
        availability = false;
      }

      if (thisBooking.hour === 0) {
        availability = false;
      }

      if (hourBlock in thisBooking.booked[thisBooking.date]) {
        if (thisBooking.booked[thisBooking.date][hourBlock].includes(parseInt(thisBooking.pickedTable))) {
          availability = false;
        }
      }
    }
    return availability;
  }

  checkFormCorrectness() {
    const thisBooking = this;

    if (thisBooking.dom.phone.value === '') {
      alert('Please provide phone number.');
      return false;
    }

    if (thisBooking.dom.address.value === '') {
      alert('Please provide your address.');
      return false;
    }

    if (thisBooking.pickedTable === false || typeof thisBooking.pickedTable === 'undefined') {
      alert('Please pick a table.');
      return false;
    }

    if (thisBooking.dom.hourPickerInput.classList.contains(classNames.booking.colidingHour)) {
      alert('Please change duration or pick another hour.');
      return false;
    }

    return true;
  }

  initActions() {
    const thisBooking = this;

    thisBooking.dom.floor.addEventListener('click', function (event) {
      if (event.target.classList.contains(classNames.booking.table) & !event.target.classList.contains(classNames.booking.tableBooked)) {
        for (let table of thisBooking.dom.tables) {
          if (event.target === table) {
            table.classList.toggle(classNames.booking.pickedTable);
          } else {
            table.classList.remove(classNames.booking.pickedTable);
          }
        }

        if (thisBooking.pickedTable === event.target.getAttribute(settings.booking.tableIdAttribute)) {
          thisBooking.pickedTable = false;
        } else {
          thisBooking.pickedTable = event.target.getAttribute(settings.booking.tableIdAttribute);
        }
      }
      thisBooking.updateDOM();
    });

    thisBooking.dom.submit.addEventListener('submit', function (event) {
      event.preventDefault();
      if (thisBooking.checkFormCorrectness()) {
        thisBooking.sendBooking();
      }
    });
  }

  sendBooking() {
    const thisBooking = this;

    const url = settings.db.url + '/' + settings.db.booking;

    const payload = {};
    payload.date = thisBooking.date;
    payload.hour = utils.numberToHour(thisBooking.hour);
    payload.table = parseInt(thisBooking.pickedTable);
    payload.duration = thisBooking.hoursAmountWidget.value;
    payload.ppl = thisBooking.peopleAmountWidget.value;
    payload.starters = [];
    payload.phone = thisBooking.dom.phone.value;
    payload.address = thisBooking.dom.address.value;

    for (let starter of thisBooking.dom.starters) {
      if (starter.checked === true) {
        payload.starters.push(starter.value);
      }
    }

    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    };

    fetch(url, options)
      .then(function (response) {
        return response.json();
      }).then(function (parsedResponse) {
        thisBooking.makeBooked(parsedResponse.date, parsedResponse.hour, parsedResponse.duration, parsedResponse.table);
      });
  }
}

export default Booking;