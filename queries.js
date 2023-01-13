const { pool } = require("./database");
const moment = require("moment");
const { parse } = require("json2csv");
const fs = require("fs");
const Chat = require("./models/chat");
const Chat_Message = require("./models/chat_messages");

const user_id = "635a5c7182cf0b92a40788b5";
const nowDate = new Date();
let todaysDate =
  nowDate.getFullYear() +
  "-" +
  (nowDate.getMonth() + 1) +
  "-" +
  (nowDate.getDate() - 1) +
  " 00:00:00+00";

let nextDayDate =
  nowDate.getFullYear() +
  "-" +
  (nowDate.getMonth() + 1) +
  "-" +
  nowDate.getDate() +
  " 00:00:00+00";

console.log("NextdayDate : ", nextDayDate, "Todays Date : ", todaysDate);

let startTime =
  nowDate.getFullYear() +
  "-" +
  (nowDate.getMonth() + 1) +
  "-" +
  (nowDate.getDate() - 1) +
  " 07:00:00+00";

let endTime =
  nowDate.getFullYear() +
  "-" +
  (nowDate.getMonth() + 1) +
  "-" +
  nowDate.getDate() +
  " 02:00:00+00";

// console.log("Stat Time : ", startTime, "  End Time : ", endTime);

function getRatings(ratingArr) {
  const rating = {};
  if (ratingArr.length == 0) {
    rating.bot = 0;
    rating.agent = 0;
  } else if (ratingArr.length == 1) {
    if (ratingArr[0].platform == "BOT") {
      rating.bot = parseInt(ratingArr[0].count);
      rating.agent = 0;
    } else {
      rating.agent = parseInt(ratingArr[0].count);
      rating.bot = 0;
    }
  } else {
    rating.bot =
      ratingArr[0].platform == "BOT"
        ? parseInt(ratingArr[0].count)
        : parseInt(ratingArr[1].count);
    rating.agent =
      ratingArr[0].platform == "AGENT"
        ? parseInt(ratingArr[0].count)
        : parseInt(ratingArr[1].count);
  }
  return rating;
}

async function fetchChatMessages(userId) {
  const startDate = moment().subtract(1, "days").startOf("day").format();
  const endDate = moment().startOf("day").format();
  console.log("start : ", startDate, endDate);
  try {
    const messages = await Chat_Message.find(
      {
        user_id: userId,
        created_at: {
          $gte: startDate,
          $lt: endDate,
        },
      },
      {
        user_id: 0,
        provider_id: 0,
        timestamp: 0,
        media_url: 0,
        filename: 0,
        caption: 0,
        wa_message_id: 0,
        message_id: 0,
        location: 0,
        contacts: 0,
        buttons: 0,
        list_values: 0,
        chat_id: 0,
      }
    );
    return messages;
  } catch (err) {
    console.log(err);
  }
}

async function fetchChatsPerDay(userId) {
  const startDate = moment().subtract(1, "days").startOf("day").format();
  const endDate = moment().startOf("day").format();
  try {
    const chats = await Chat.find(
      {
        user_id: userId,
        // created_at: {
        //   $gte: startDate,
        //   $lt: endDate,
        // },
      },
      {
        _id: 0,
        user_id: 0,
        timestamp: 0,
        user_initiated: 0,
        trigger_unread_email: 0,
        avatar: 0,
        agent_assign_timestamp: 0,
      }
    );
    return chats;
  } catch (err) {
    console.log(err);
  }
}

// 1 getting counts of chats using user_id
async function fetchChatsPerDayCount(userId) {
  const startDate = moment().subtract(1, "days").startOf("day").format();
  const endDate = moment().startOf("day").format();
  try {
    const chatsCount = await Chat.find({
      user_id: userId,
      created_at: {
        $gte: startDate,
        $lt: endDate,
      },
    }).count();
    return chatsCount;
  } catch (err) {
    console.log(err);
  }
}

// 2 getting count of tickets closed by bot, in this I have to find the tickets closed by agent also??

async function fetchClosedTicketsByBot(userId) {
  const botClosedTickets = await pool.query(
    "SELECT COUNT(*) FROM TICKETS WHERE user_id = $1 AND is_handled_by_bot = true AND is_handoff = false AND is_closed = true AND created_at >= $2 AND created_at < $3",
    [userId, todaysDate, nextDayDate]
  );

  const agentClosedTickets = await pool.query(
    "SELECT COUNT(*) FROM TICKETS WHERE user_id = $1 AND is_handled_by_bot = true AND is_handoff = true AND is_closed = true AND created_at >= $2 AND created_at < $3",
    [userId, todaysDate, nextDayDate]
  );

  if (botClosedTickets.rows.length) {
    return {
      closedTicketsBotCount: parseInt(botClosedTickets.rows[0].count),
      closedTicketsAgentCount: parseInt(agentClosedTickets.rows[0].count),
    };
  } else {
    return { closedTicketsBotCount: 0, closedTicketsAgentCount: 0 };
  }
}

async function fetchBotAutomation(userId) {
  const totalTickets = await pool.query(
    "SELECT COUNT(*) FROM TICKETS WHERE user_id = $1 AND is_handled_by_bot = true AND created_at >= $2 AND created_at < $3",
    [userId, todaysDate, nextDayDate]
  );

  const totalTicketsCount = totalTickets.rows[0].count;
  let closedTicketsCount = await fetchClosedTicketsByBot(userId);
  closedTicketsCount = closedTicketsCount.closedTicketsBotCount;

  const automationRate =
    totalTicketsCount > 0
      ? Math.floor((closedTicketsCount / totalTicketsCount) * 100)
      : 0;

  return automationRate;
}

// 4 total number of customers rated us
async function getCountOfCustomersRatedUs(userId) {
  const count = await pool.query(
    "SELECT COUNT(*) FROM CSAT WHERE user_id = $1 AND created_at >= $2 AND created_at < $3",
    [userId, todaysDate, nextDayDate]
  );

  if (count.rows.length) {
    const totalCount = count.rows[0].count;
    return parseInt(totalCount);
  } else {
    return 0;
  }
}

// 5 get ratings of bot and agent
async function getAgentAndBotRatings(userId) {
  let positiveRatings = await pool.query(
    "SELECT platform, COUNT(rating) FROM CSAT WHERE user_id = $1 AND (rating = 5 OR rating = 4) AND created_at >= $2 AND created_at < $3 GROUP BY platform",
    [userId, todaysDate, nextDayDate]
  );
  let neutralRatings = await pool.query(
    "SELECT platform, COUNT(rating) FROM CSAT WHERE user_id = $1 AND rating = 3 AND created_at >= $2 AND created_at < $3 GROUP BY platform",
    [userId, todaysDate, nextDayDate]
  );
  let negativeRatings = await pool.query(
    "SELECT platform, COUNT(rating) FROM CSAT WHERE user_id = $1 AND (rating = 1 OR rating = 2) AND created_at >= $2 AND created_at < $3 GROUP BY platform",
    [userId, todaysDate, nextDayDate]
  );

  positiveRatings = getRatings(positiveRatings.rows);
  neutralRatings = getRatings(neutralRatings.rows);
  negativeRatings = getRatings(negativeRatings.rows);

  const ratings = {
    bot_positive_rating: positiveRatings.bot,
    bot_neutral_rating: neutralRatings.bot,
    bot_negative_rating: negativeRatings.bot,
    agent_positive_rating: positiveRatings.agent,
    agent_neutral_rating: neutralRatings.agent,
    agent_negative_rating: negativeRatings.agent,
  };

  return ratings;
}

// 6 get chat bot user intent
async function chatBotUSerIntent(userId) {
  let data = await pool.query(
    "SELECT query, COUNT(*) FROM TICKETS WHERE user_id = $1 AND is_handled_by_bot = true AND query IS NOT NULL AND created_at >= $2 AND created_at < $3 GROUP BY query",
    [userId, todaysDate, nextDayDate]
  );

  data = data.rows;
  return data;
}

// 8 get conversations count where first_agent_frt not null
async function getConverstaionsFRTNotNull(userId) {
  let conversations = await pool.query(
    "SELECT COUNT(*) FROM  TICKETS WHERE user_id = $1 AND first_agent_frt IS NOT NULL AND created_at >= $2 AND created_at < $3",
    [userId, todaysDate, nextDayDate]
  );

  const converstaionsCount = conversations.rows[0].count;
  return parseInt(converstaionsCount);
}

//

// 9 Average difference between (first_agent_message_time - last_bot_message_time)
async function getAvgOfFrtAndLbmt(userId) {
  let result = await pool.query(
    "SELECT AVG(first_agent_message_time - last_bot_message_time) FROM tickets WHERE user_id = $1 AND first_agent_message_time IS NOT NULL AND last_bot_message_time IS NOT NULL AND created_at >= $2 AND created_at < $3",
    [userId, todaysDate, nextDayDate]
  );
  if (result.rows[0].avg) {
    result = result.rows[0].avg.minutes;
    return result;
  } else {
    return 0;
  }
}

// 10 Avergae of overall resolution time

async function getAvergaeOfOverallRT(userId) {
  const result = await pool.query(
    "SELECT AVG(overall_rt) FROM TICKETS WHERE user_id = $1 AND overall_rt IS NOT NULL AND created_at >= $2 AND created_at < $3",
    [userId, todaysDate, nextDayDate]
  );
  if (result.rows[0].avg) {
    const average = parseInt(result.rows[0].avg);
    return average;
  } else {
    return 0;
  }
}

// 11
async function getRTAndFRTOfWorkHours(userId) {
  let frt = await pool.query(
    "SELECT frt FROM TICKETS WHERE user_id = $1 AND frt IS NOT NULL AND created_at >= $2 AND created_at < $3",
    [userId, startTime, endTime]
  );
  let rt = await pool.query(
    "SELECT overall_rt FROM TICKETS WHERE user_id = $1 AND overall_rt IS NOT NULL AND created_at >= $2 AND created_at < $3",
    [userId, todaysDate, nextDayDate]
  );

  frt = frt.rows;
  rt = rt.rows;
  return { frt, rt };
}

// 12

async function getAvgOfFrt(userId) {
  let avgFrt = await pool.query(
    "SELECT AVG(first_agent_message_time - last_bot_message_time) FROM tickets WHERE user_id = $1 AND first_agent_message_time IS NOT NULL AND last_bot_message_time IS NOT NULL AND created_at >= $2 AND created_at < $3",
    [userId, startTime, endTime]
  );

  if (avgFrt.rows[0].avg) {
    avgFrt = avgFrt.rows[0].avg.minutes;
    return parseInt(avgFrt);
  } else {
    return 0;
  }
}

// 13 average RT for working hours

async function getAvgRTForWorkHours(userId) {
  let avgRt = await pool.query(
    "SELECT AVG(overall_rt) FROM TICKETS WHERE user_id = $1 AND created_at >= $2 AND created_at <= $3 AND user_id = $1 AND overall_rt IS NOT NULL",
    [userId, startTime, endTime]
  );
  // console.log(avgRt.rows[0].avg);
  if (avgRt.rows[0].avg) {
    avgRt = parseInt(avgRt.rows[0].avg);
    return parseInt(avgRt);
  } else {
    return 0;
  }
}

async function createCSV() {
  try {
    const messages = await fetchChatMessages(user_id);
    const chats = await fetchChatsPerDay(user_id);

    const chatsCSV = parse(JSON.parse(JSON.stringify(chats)));
    fs.writeFileSync("./chats.csv", chatsCSV);

    const messageCSV = parse(JSON.parse(JSON.stringify(messages)));
    fs.writeFileSync("./messages.csv", messageCSV);

    await pool.query(
      "CREATE TEMPORARY TABLE temp_tickets AS SELECT * FROM tickets WHERE user_id = $1",
      [user_id]
    );

    await pool.query(
      "ALTER TABLE temp_tickets DROP COLUMN frt, DROP COLUMN wait_time,  DROP COLUMN chat_id"
    );
    let ticketsData = await pool.query(
      "SELECT * FROM temp_tickets where user_id = $1",
      [user_id]
    );
    ticketsData = ticketsData.rows;

    await pool.query(
      "CREATE TEMPORARY TABLE temp_user_sessions AS SELECT * FROM user_sessions WHERE user_id = $1",
      [user_id]
    );

    await pool.query("ALTER TABLE temp_user_sessions DROP COLUMN ip_address");
    let userSessionData = await pool.query(
      "SELECT * FROM temp_user_sessions WHERE user_id = $1 AND created_at >= $2 AND created_at < $3",
      [user_id, todaysDate, nextDayDate]
    );
    userSessionData = userSessionData.rows;
    for (let i = 0; i < ticketsData.length; i++) {
      if (ticketsData[i]["first_assigned_at"])
        ticketsData[i]["first_assigned_at"] = moment(
          new Date(ticketsData[0].first_assigned_at)
        ).format("YYYY-MM-DD hh:mm:ss");

      if (ticketsData[i]["first_agent_message_time"])
        ticketsData[i]["first_agent_message_time"] = moment(
          new Date(ticketsData[0].first_agent_message_time)
        ).format("YYYY-MM-DD hh:mm:ss");

      if (ticketsData[i]["last_agent_message_time"])
        ticketsData[i]["last_agent_message_time"] = moment(
          new Date(ticketsData[0].last_agent_message_time)
        ).format("YYYY-MM-DD hh:mm:ss");

      if (ticketsData[i]["first_bot_message_time"])
        ticketsData[i]["first_bot_message_time"] = moment(
          new Date(ticketsData[0].first_bot_message_time)
        ).format("YYYY-MM-DD hh:mm:ss");

      if (ticketsData[i]["last_bot_message_time"])
        ticketsData[i]["last_bot_message_time"] = moment(
          new Date(ticketsData[0].last_bot_message_time)
        ).format("YYYY-MM-DD hh:mm:ss");

      if (ticketsData[i]["first_customer_message_time"])
        ticketsData[i]["first_customer_message_time"] = moment(
          new Date(ticketsData[0].first_customer_message_time)
        ).format("YYYY-MM-DD hh:mm:ss");

      if (ticketsData[i]["last_customer_message_time"])
        ticketsData[i]["last_customer_message_time"] = moment(
          new Date(ticketsData[0].last_customer_message_time)
        ).format("YYYY-MM-DD hh:mm:ss");

      if (ticketsData[i]["last_resolution_time"])
        ticketsData[i]["last_resolution_time"] = moment(
          new Date(ticketsData[0].last_resolution_time)
        ).format("YYYY-MM-DD hh:mm:ss");

      if (ticketsData[i]["ticket_closed_at"])
        ticketsData[i]["ticket_closed_at"] = moment(
          new Date(ticketsData[0].ticket_closed_at)
        ).format("YYYY-MM-DD hh:mm:ss");

      if (ticketsData[i]["ticket_queued_at"])
        ticketsData[i]["ticket_queued_at"] = moment(
          new Date(ticketsData[0].ticket_queued_at)
        ).format("YYYY-MM-DD hh:mm:ss");

      ticketsData[i]["created_at"] = moment(
        new Date(ticketsData[0].created_at)
      ).format("YYYY-MM-DD hh:mm:ss");
      ticketsData[i]["updated_at"] = moment(
        new Date(ticketsData[0].updated_at)
      ).format("YYYY-MM-DD hh:mm");
    }

    for (let i = 0; i < userSessionData.length; i++) {
      userSessionData[i]["created_at"] = moment(
        new Date(userSessionData[0].created_at)
      ).format("YYYY-MM-DD hh:mm");

      userSessionData[i]["updated_at"] = moment(
        new Date(userSessionData[0].updated_at)
      ).format("YYYY-MM-DD hh:mm");
    }
    // console.log(userSessionData);
    const userSessionCSV = await parse(userSessionData);
    fs.writeFileSync("./user_session.csv", userSessionCSV);

    const ticketsCSV = await parse(ticketsData);
    fs.writeFileSync("./tickets.csv", ticketsCSV);
  } catch (err) {
    console.log(err);
  }
}

createCSV();

async function getReportData() {
  const chatsPerDay = await fetchChatsPerDayCount(user_id);
  const closedTickets = await fetchClosedTicketsByBot(user_id);
  const botAutomation = await fetchBotAutomation(user_id);
  const countOfCustomersRatedUs = await getCountOfCustomersRatedUs(user_id);
  const rating = await getAgentAndBotRatings(user_id);
  const chat_bot_user_intent = await chatBotUSerIntent(user_id);
  const chats_handed_to_agent_frt_not_null = await getConverstaionsFRTNotNull(
    user_id
  );
  const avg_frt = await getAvgOfFrtAndLbmt(user_id);
  const avg_rt = await getAvergaeOfOverallRT(user_id);
  const rt_frt_work_hours = await getRTAndFRTOfWorkHours(user_id);
  const frt_for_work_hours = [...rt_frt_work_hours.frt];
  const rt_for_work_hours = [...rt_frt_work_hours.rt];
  const avg_frt_work_hours = await getAvgOfFrt(user_id);
  const avg_rt_work_hours = await getAvgRTForWorkHours(user_id);

  const report = {
    chats_per_day: chatsPerDay,
    closed_tickets_bot_count: closedTickets.closedTicketsBotCount,
    closed_tickets_agent_count: closedTickets.closedTicketsAgentCount,
    bot_automation_rate: botAutomation,
    count_of_customers_rated_us: countOfCustomersRatedUs,
    rating,
    chat_bot_user_intent,
    chats_handed_to_agent_frt_not_null,
    avg_frt,
    avg_rt,
    rt_for_work_hours,
    frt_for_work_hours,
    avg_frt_work_hours,
    avg_rt_work_hours,
  };

  // console.log(report);
}

module.exports = { getReportData };
