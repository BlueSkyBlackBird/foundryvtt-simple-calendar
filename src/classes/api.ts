import SimpleCalendar from "./simple-calendar";
import {DateParts, DateTimeIntervals} from "../interfaces";
import {Logger} from "./logging";
import {GameSettings} from "./game-settings";
import {GameSystems, TimeKeeperStatus} from "../constants";
import PF2E from "./systems/pf2e";

/**
 * All external facing functions for other systems, modules or macros to consume
 */
export default class API{
    /**
     * Get the timestamp for the current year
     */
    public static timestamp(): number{
        if(SimpleCalendar.instance && SimpleCalendar.instance.currentYear){
            return SimpleCalendar.instance.currentYear.toSeconds();
        }
        return 0;
    }

    /**
     * Takes in a current time stamp and adds the passed in interval to it and returns the new time stamp
     * @param currentSeconds
     * @param interval
     */
    public static timestampPlusInterval(currentSeconds: number, interval: DateTimeIntervals): number{
        if(SimpleCalendar.instance && SimpleCalendar.instance.currentYear){
            const clone = SimpleCalendar.instance.currentYear.clone();

            // If this is a Pathfinder 2E game, add the world creation seconds to the interval seconds
            if(SimpleCalendar.instance.currentYear.gameSystem === GameSystems.PF2E && SimpleCalendar.instance.currentYear.generalSettings.pf2eSync){
                currentSeconds += PF2E.getWorldCreateSeconds();
            }

            const dateTime = clone.secondsToDate(currentSeconds);
            clone.updateTime(dateTime);
            if(interval.year){
                clone.changeYear(interval.year, true, 'current');
            }
            if(interval.month){
                clone.changeMonth(interval.month, 'current');
            }
            if(interval.day){
                clone.changeDay(interval.day);
            }
            const dayChange = clone.time.changeTime(interval.hour, interval.minute, interval.second);
            if(dayChange !== 0){
                clone.changeDay(dayChange);
            }
            return clone.toSeconds();
        }
        return 0;
    }

    /**
     * Takes in a timestamp in seconds and converts it to a date object.
     * @param seconds
     */
    public static timestampToDate(seconds: number){
        const result = {
            year: 0,
            month: 0,
            day: 0,
            dayOfTheWeek: 0,
            hour: 0,
            minute: 0,
            second: 0,
            monthName: "",
            yearName: "",
            yearZero: 0,
            weekdays: <string[]>[]
        };
        if(SimpleCalendar.instance && SimpleCalendar.instance.currentYear){
            // If this is a Pathfinder 2E game, add the world creation seconds
            if(SimpleCalendar.instance.currentYear.gameSystem === GameSystems.PF2E && SimpleCalendar.instance.currentYear.generalSettings.pf2eSync){
                seconds += PF2E.getWorldCreateSeconds();
            }

            const dateTime = SimpleCalendar.instance.currentYear.secondsToDate(seconds);
            result.year = dateTime.year;
            result.month = dateTime.month;
            result.day = dateTime.day;
            result.hour = dateTime.hour;
            result.minute = dateTime.minute;
            result.second = dateTime.seconds;

            const month = SimpleCalendar.instance.currentYear.months[dateTime.month];
            result.monthName = month.name;
            result.yearZero = SimpleCalendar.instance.currentYear.yearZero;
            result.yearName = SimpleCalendar.instance.currentYear.getYearName(result.year);
            result.dayOfTheWeek = SimpleCalendar.instance.currentYear.dayOfTheWeek(result.year, month.numericRepresentation, dateTime.day + 1);
            result.weekdays = SimpleCalendar.instance.currentYear.weekdays.map(w => w.name);
        }
        return result;
    }

    /**
     * Converts the passed in date to a timestamp. If date members are missing the current date members are used.
     * @param {DateTimeIntervals} date
     */
    public static dateToTimestamp(date: DateTimeIntervals): number{
        let ts = 0;
        if(SimpleCalendar.instance && SimpleCalendar.instance.currentYear){
            const clone = SimpleCalendar.instance.currentYear.clone();
            const currentMonth = clone.getMonth();
            const currentTime = clone.time.getCurrentTime();
            if(date.second === undefined){
                date.second = parseInt(currentTime.second);
            }

            if(date.minute === undefined){
                date.minute = parseInt(currentTime.minute);
            }

            if(date.hour === undefined){
                date.hour = parseInt(currentTime.hour);
            }

            // If not year is passed in, set to the current year
            if(date.year === undefined){
                date.year = clone.numericRepresentation;
            }
            if(date.month === undefined){
                if(currentMonth){
                    date.month = clone.months.findIndex(m => m.numericRepresentation === currentMonth.numericRepresentation);
                } else {
                    date.month = 0;
                }
            }
            if(date.day === undefined){
                date.day = 0;
                if(currentMonth){
                    const currDay = currentMonth.getDay();
                    if(currDay){
                        date.day = currentMonth.days.findIndex(d => d.numericRepresentation === currDay.numericRepresentation);
                    }
                }
            }
            clone.updateMonth(date.month, 'current', true, date.day);
            clone.numericRepresentation = date.year;
            clone.time.setTime(date.hour, date.minute, date.second);
            ts = clone.toSeconds();
        }
        return ts;
    }

    /**
     * Attempts to convert the passed in seconds to an interval (day, month, year, hour, minute, second etc)
     * @param seconds
     */
    public static secondsToInterval(seconds: number): DateTimeIntervals{
        let results: DateTimeIntervals = {
            year: 0,
            month: 0,
            day: 0,
            hour: 0,
            minute: 0,
            second: 0
        };
        if(SimpleCalendar.instance && SimpleCalendar.instance.currentYear) {
            results = SimpleCalendar.instance.currentYear.secondsToInterval(seconds);
        }
        return results;
    }

    /**
     * Returns the current status of the clock
     */
    public static clockStatus(){
        const data = {
            started: false,
            stopped: true,
            paused: false
        };
        if(SimpleCalendar.instance && SimpleCalendar.instance.currentYear){
            const status = SimpleCalendar.instance.currentYear.time.timeKeeper.getStatus();
            data['started'] = status === TimeKeeperStatus.Started;
            data['stopped'] = status === TimeKeeperStatus.Stopped;
            data['paused'] = status === TimeKeeperStatus.Paused;
        }
        return data;
    }

    /**
     * Shows the calendar. If a date is passed in, the calendar will open so that date is visible and selected
     * @param {DateParts | null} [date=null] The date to set as visible, it not passed in what ever the users current date will be used
     * @param {boolean} [compact=false] If the calendar should open in compact mode or not
     */
    public static showCalendar(date: DateParts | null = null, compact: boolean = false){
        if(SimpleCalendar.instance && SimpleCalendar.instance.currentYear){
            if(date !== null){
                if(date.hasOwnProperty('year') && Number.isInteger(date.year) && date.hasOwnProperty('month') && Number.isInteger(date.month) && date.hasOwnProperty('day') && Number.isInteger(date.day)){
                    const isLeapYear = SimpleCalendar.instance.currentYear.leapYearRule.isLeapYear(date.year);
                    SimpleCalendar.instance.currentYear.visibleYear = date.year;
                    if(date.month === -1 || date.month > SimpleCalendar.instance.currentYear.months.length){
                        date.month = SimpleCalendar.instance.currentYear.months.length - 1;
                    }
                    SimpleCalendar.instance.currentYear.resetMonths('visible');
                    SimpleCalendar.instance.currentYear.months[date.month].visible = true;

                    const numberOfDays = isLeapYear? SimpleCalendar.instance.currentYear.months[date.month].numberOfLeapYearDays : SimpleCalendar.instance.currentYear.months[date.month].numberOfDays;
                    if(date.day > 0){
                        date.day = date.day - 1;
                    }
                    if(date.day == -1 || date.day > numberOfDays){
                        date.day = numberOfDays - 1;
                    }
                    SimpleCalendar.instance.currentYear.resetMonths('selected');
                    SimpleCalendar.instance.currentYear.months[date.month].days[date.day].selected = true;
                    SimpleCalendar.instance.currentYear.months[date.month].selected = true;
                    SimpleCalendar.instance.currentYear.selectedYear = SimpleCalendar.instance.currentYear.visibleYear;
                } else {
                    Logger.error('SimpleCalendar.api.showCalendar: Invalid date passed in.');
                }
            }
            SimpleCalendar.instance.compactView = compact;
            SimpleCalendar.instance.showApp();
        } else {
            Logger.error('The current year is not defined.');
        }
    }

    /**
     * Changes the date of the calendar by the passed in interval. Checks to make sure only users who have permission can change the date.
     * @param interval
     */
    public static changeDate(interval: DateTimeIntervals): boolean{
        if(SimpleCalendar.instance && SimpleCalendar.instance.currentYear && SimpleCalendar.instance.currentYear.canUser(game.user, SimpleCalendar.instance.currentYear.generalSettings.permissions.changeDateTime)){
            let change = false;
            if(interval.year){
                SimpleCalendar.instance.currentYear.changeYear(interval.year, true, 'current');
                change = true;
            }
            if(interval.month){
                SimpleCalendar.instance.currentYear.changeMonth(interval.month, 'current');
                change = true;
            }
            if(interval.day){
                SimpleCalendar.instance.currentYear.changeDay(interval.day);
                change = true;
            }
            if(interval.hour || interval.minute || interval.second){
                const dayChange = SimpleCalendar.instance.currentYear.time.changeTime(interval.hour, interval.minute, interval.second);
                if(dayChange !== 0){
                    SimpleCalendar.instance.currentYear.changeDay(dayChange);
                }
                change = true;
            }

            if(change){
                GameSettings.SaveCurrentDate(SimpleCalendar.instance.currentYear).catch(Logger.error);
                SimpleCalendar.instance.currentYear.syncTime().catch(Logger.error);
                SimpleCalendar.instance.updateApp();
            }
            return true;
        } else {
            GameSettings.UiNotification(GameSettings.Localize('FSC.Warn.Macros.GMUpdate'), 'warn');
        }
        return false;
    }

    /**
     * Sets the current date to the passed in date object
     * @param date
     */
    public static setDate(date: DateTimeIntervals): boolean{
        if(SimpleCalendar.instance && SimpleCalendar.instance.currentYear && SimpleCalendar.instance.currentYear.canUser(game.user, SimpleCalendar.instance.currentYear.generalSettings.permissions.changeDateTime)){
            const seconds = this.dateToTimestamp(date);
            SimpleCalendar.instance.currentYear.updateTime(SimpleCalendar.instance.currentYear.secondsToDate(seconds));
            GameSettings.SaveCurrentDate(SimpleCalendar.instance.currentYear).catch(Logger.error);
            SimpleCalendar.instance.currentYear.syncTime().catch(Logger.error);
            SimpleCalendar.instance.updateApp();
            return true;
        } else {
            GameSettings.UiNotification(GameSettings.Localize('FSC.Warn.Macros.GMUpdate'), 'warn');
        }
        return false;
    }

    /**
     * Randomly chooses a date between the two passed in dates, or if no dates passed in chooses a random date.
     * @param startingDate
     * @param endingDate
     */
    public static chooseRandomDate(startingDate: DateTimeIntervals = {}, endingDate: DateTimeIntervals = {}): DateTimeIntervals {
        let year = 0, month = 0, day = 0, hour = 0, minute = 0, second = 0;

        if(SimpleCalendar.instance && SimpleCalendar.instance.currentYear){
            /**
             * Choose a random year
             *      If the starting and ending year are the same, use that year
             *      If they are different random choose a year between them (they are included)
             *      If no years are provided, random choose a year between 0 and 10,000
             */
            if(startingDate.year !== undefined && endingDate.year !== undefined){
                if(startingDate.year === endingDate.year){
                    year = startingDate.year;
                } else {
                    year = Math.floor(Math.random() * (endingDate.year - startingDate.year + 1)) + startingDate.year;
                }
            } else {
                year = Math.floor(Math.random() * 10000);
            }

            /**
             * Choose a random month
             *      If the starting and ending month are the same use that month
             *      If they are different randomly choose a month between them (they are included)
             *      If no months are provided randomly choose a month between 0 and the number of months in a year
             */
            if(startingDate.month !== undefined && endingDate.month !== undefined){
                if(startingDate.month === endingDate.month){
                    month = startingDate.month;
                } else {
                    month = Math.floor(Math.random() * (endingDate.month - startingDate.month + 1)) + startingDate.month;
                }
            } else {
                month = Math.floor(Math.random() * SimpleCalendar.instance.currentYear.months.length);
            }

            if(month < 0 || month >= SimpleCalendar.instance.currentYear.months.length){
                month = SimpleCalendar.instance.currentYear.months.length - 1;
            }

            let monthObject = SimpleCalendar.instance.currentYear.months[month];
            /**
             * Chose a random day
             *      If the starting and ending day are the same use that day
             *      If they are different randomly choose a day between them (they are included)
             *      If no days are provided randomly choose a day between 0 and the number of days in the month selected above
             */
            if(startingDate.day !== undefined && endingDate.day !== undefined){
                if(startingDate.day === endingDate.day){
                    day = startingDate.day;
                } else {
                    day = Math.floor(Math.random() * (endingDate.day - startingDate.day + 1)) + startingDate.day;
                }
            } else {
                day = Math.floor(Math.random() * monthObject.days.length);
            }

            if(day < 0 || day >= monthObject.days.length){
                day = monthObject.days.length - 1;
            }

            if(startingDate.hour !== undefined && endingDate.hour !== undefined){
                if(startingDate.hour === endingDate.hour){
                    hour = startingDate.hour;
                } else {
                    hour = Math.floor(Math.random() * (endingDate.hour - startingDate.hour + 1)) + startingDate.hour;
                }
            } else {
                hour = Math.floor(Math.random() * SimpleCalendar.instance.currentYear.time.hoursInDay);
            }

            if(startingDate.minute !== undefined && endingDate.minute !== undefined){
                if(startingDate.minute === endingDate.minute){
                    minute = startingDate.minute;
                } else {
                    minute = Math.floor(Math.random() * (endingDate.minute - startingDate.minute + 1)) + startingDate.minute;
                }
            } else {
                minute = Math.floor(Math.random() * SimpleCalendar.instance.currentYear.time.minutesInHour);
            }

            if(startingDate.second !== undefined && endingDate.second !== undefined){
                if(startingDate.second === endingDate.second){
                    second = startingDate.second;
                } else {
                    second = Math.floor(Math.random() * (endingDate.second - startingDate.second + 1)) + startingDate.second;
                }
            } else {
                second = Math.floor(Math.random() * SimpleCalendar.instance.currentYear.time.secondsInMinute);
            }
        }
        return {
          year: year,
          month: month,
          day: day,
          hour: hour,
          minute: minute,
          second: second
        };
    }

    /**
     * Returns if the current user is the primary GM
     */
    public static isPrimaryGM(){
        if(SimpleCalendar.instance){
            return SimpleCalendar.instance.primary;
        }
        return  false;
    }

    /**
     * Starts the built in clock - if the user is the primary gm
     */
    public static startClock(){
        if(SimpleCalendar.instance && SimpleCalendar.instance.primary && SimpleCalendar.instance.currentYear){
            SimpleCalendar.instance.currentYear.time.timeKeeper.start();
            return true;
        }
        return false;
    }

    /**
     * Stops the build in clock
     */
    public static stopClock(){
        if(SimpleCalendar.instance && SimpleCalendar.instance.currentYear){
            SimpleCalendar.instance.currentYear.time.timeKeeper.stop();
            return true;
        }
        return false;
    }
}