import { application, Request, Response } from "express";
import dataSource from "../database.js";
import Project from "../models/Project.js";
import { In, Like, Not } from "typeorm";
import Category from "../models/Category.js";
import Application from "../models/Application.js";
import Recommendation from "../models/Recommendation.js";
import {
  applicationStatuses,
  campuses,
  employmentTypes,
  projectTypes,
} from "../utils/projectChoices.js";

export const getProjects = async (req: Request, res: Response) => {
  try {
    const projectsRepo = dataSource.getRepository(Project);

    const searchParam = req.query.search ? req.query.search : "";

    const projects = await projectsRepo.findAndCount({
      select: {
        creatorUserId: false,
      },
      relations: {
        user: true,
        categories: true,
      },
      where: [
        { name: Like(`%${searchParam}%`), creatorUserId: Not(req.userId), isClosed: false },
        { description: Like(`%${searchParam}%`), creatorUserId: Not(req.userId), isClosed: false },
      ],
      order: {
        id: "DESC",
      },
      skip: req.query.skip as any,
      take: req.query.take as any,
    });

    res.status(200).json({
      projects: projects[0].map((p) => {
        const { user, ...projectData } = p;
        const userFullName = user.fullName;
        return {
          ...projectData,
          userFullName,
        };
      }),
      count: projects[1],
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

export const getProject = async (req: Request, res: Response) => {
  try {
    const projectsRepo = dataSource.getRepository(Project);

    const project = await projectsRepo.findOne({
      select: {
        creatorUserId: false,
      },
      relations: {
        user: true,
        categories: true,
      },
      where: {
        id: req.params.id as any,
      },
      order: {
        id: "DESC",
      },
    });

    res.status(200).json(project);
  } catch (err) {
    console.log(err);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

export const getUserProjects = async (req: Request, res: Response) => {
  try {
    const projectsRepo = dataSource.getRepository(Project);

    console.log(req.userId);

    const projects = await projectsRepo.findAndCount({
      select: {
        creatorUserId: false,
      },
      relations: {
        user: true,
        categories: true,
      },
      where: {
        creatorUserId: req.userId,
      },
      order: {
        id: "DESC",
      },
      skip: req.query.skip as any,
      take: req.query.take as any,
    });

    res.status(200).json({
      projects: projects[0].map((p) => {
        const { user, ...projectData } = p;
        const userFullName = user.fullName;
        return {
          ...projectData,
          userFullName,
        };
      }),
      count: projects[1],
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

export const getProjectsByTag = async (req: Request, res: Response) => {
  try {
    const projectsRepo = dataSource.getRepository(Project);

    const tagParam = req.query.tag ? req.query.tag : "";

    const projects = await projectsRepo.find({
      select: {
        creatorUserId: false,
      },
      relations: {
        user: true,
        categories: true,
      },
      order: {
        id: "DESC",
      },
    });

    res.status(200).json(projects.filter((p) => p.categories.some((t) => t.category == tagParam)));
  } catch (err) {
    console.log(err);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

export const createProject = async (req: Request, res: Response) => {
  try {
    const projectsRepo = dataSource.getRepository(Project);
    const categoriesRepo = dataSource.getRepository(Category);

    const newProject = new Project();
    newProject.creatorUserId = req.userId;
    newProject.name = req.body.name;
    newProject.description = req.body.description;
    newProject.contacts = req.body.contacts;
    newProject.startDate = req.body.startDate;
    newProject.endDate = req.body.endDate;
    newProject.applicationDeadline = req.body.applicationDeadline;
    newProject.employmentType = req.body.employmentType;
    newProject.territory = req.body.territory;
    newProject.skills = req.body.skills;
    newProject.creditNumber = req.body.creditNumber;
    newProject.campus = req.body.campus;
    newProject.participantsNumber = req.body.participantsNumber;
    newProject.projectType = req.body.projectType;
    newProject.weeklyHours = req.body.weeklyHours;

    newProject.isClosed = false;

    req.body.categories = req.body.categories ? req.body.categories : [];
    req.body.customCategories = req.body.customCategories ? req.body.customCategories : [];

    const existingCategories = await categoriesRepo.find({
      where: {
        id: In(req.body.categories),
      },
    });

    const existingCustomCat = await categoriesRepo.find({
      where: {
        category: In(req.body.customCategories),
      },
    });

    const customCategories = req.body.customCategories
      .filter((c: string) => !existingCustomCat.map((x) => x.category).includes(c))
      .map((c: string) => {
        const cat = new Category();
        cat.category = c;
        cat.isCustom = true;
        return cat;
      });

    await categoriesRepo.save(customCategories);

    newProject.categories = existingCategories.concat(existingCustomCat).concat(customCategories);

    await projectsRepo.save(newProject);

    res.status(201).json({
      Success: true,
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

export const editProject = async (req: Request, res: Response) => {
  try {
    const projectsRepo = dataSource.getRepository(Project);
    const categoriesRepo = dataSource.getRepository(Category);

    const editProject = await projectsRepo.findOneBy({ id: req.body.projectId });
    if (!editProject) {
      return res.status(400).json({
        message: "Project does not exist",
      });
    }

    if (editProject.creatorUserId != req.userId) {
      return res.status(400).json({
        message: "You are not project creator",
      });
    }

    editProject.name = req.body.name ? req.body.name : editProject.name;
    editProject.description = req.body.description ? req.body.description : editProject.description;
    editProject.contacts = req.body.contacts ? req.body.contacts : editProject.contacts;
    editProject.updatedDate = new Date();

    editProject.startDate = req.body.startDate ? req.body.startDate : editProject.startDate;
    editProject.endDate = req.body.endDate ? req.body.endDate : editProject.endDate;
    editProject.applicationDeadline = req.body.applicationDeadline
      ? req.body.applicationDeadline
      : editProject.applicationDeadline;
    editProject.employmentType = req.body.employmentType
      ? req.body.employmentType
      : editProject.employmentType;
    editProject.territory = req.body.territory ? req.body.territory : editProject.territory;
    editProject.skills = req.body.skills ? req.body.skills : editProject.skills;
    editProject.creditNumber = req.body.creditNumber
      ? req.body.creditNumber
      : editProject.creditNumber;
    editProject.campus = req.body.campus ? req.body.campus : editProject.campus;
    editProject.participantsNumber = req.body.participantsNumber
      ? req.body.participantsNumber
      : editProject.participantsNumber;
    editProject.projectType = req.body.projectType ? req.body.projectType : editProject.projectType;
    editProject.weeklyHours = req.body.weeklyHours ? req.body.weeklyHours : editProject.weeklyHours;

    if (req.body.categories || req.body.customCategories) {
      req.body.categories = req.body.categories ? req.body.categories : [];
      req.body.customCategories = req.body.customCategories ? req.body.customCategories : [];

      const existingCategories = await categoriesRepo.find({
        where: {
          id: In(req.body.categories),
        },
      });

      const existingCustomCat = await categoriesRepo.find({
        where: {
          category: In(req.body.customCategories),
        },
      });

      const customCategories = req.body.customCategories
        .filter((c: string) => !existingCustomCat.map((x) => x.category).includes(c))
        .map((c: string) => {
          const cat = new Category();
          cat.category = c;
          cat.isCustom = true;
          return cat;
        });

      await categoriesRepo.save(customCategories);

      editProject.categories = existingCategories
        .concat(existingCustomCat)
        .concat(customCategories);
    }

    await projectsRepo.save(editProject);

    res.status(200).json({
      success: true,
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

export const getCategories = async (req: Request, res: Response) => {
  try {
    const categoryRepo = dataSource.getRepository(Category);

    const categories = await categoryRepo.find({
      where: {
        isCustom: false,
      },
    });

    res.status(200).json(categories);
  } catch (err) {
    console.log(err);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

export const createApplication = async (req: Request, res: Response) => {
  try {
    const applicationRepo = dataSource.getRepository(Application);
    const existingApplication = await applicationRepo.findOne({
      where: {
        applicantId: req.userId,
        projectId: req.body.projectId,
      },
    });

    if (existingApplication) {
      return res.status(400).json({
        message: "Application already exists",
      });
    }

    const newApplication = new Application();
    newApplication.applicantId = req.userId;
    newApplication.projectId = req.body.projectId;
    newApplication.message = req.body.message;
    newApplication.status = 1;

    applicationRepo.save(newApplication);

    res.status(201).json({
      success: true,
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

export const getSentApplications = async (req: Request, res: Response) => {
  try {
    const applicationRepo = dataSource.getRepository(Application);
    const userApplications = await applicationRepo.find({
      where: {
        applicantId: req.userId,
      },
    });

    res.status(200).json(userApplications);
  } catch (err) {
    console.log(err);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

export const getIncomingApplications = async (req: Request, res: Response) => {
  try {
    const applicationRepo = dataSource.getRepository(Application);

    const applications = await applicationRepo.find({
      relations: {
        applicant: true,
      },
      where: {
        project: {
          creatorUserId: req.userId,
        },
      },
    });

    res.status(200).json(applications);
  } catch (err) {
    console.log(err);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

export const processApplication = async (req: Request, res: Response) => {
  try {
    const applicationRepo = dataSource.getRepository(Application);

    const action = req.body.action;
    if (action !== 2 && action !== 3) {
      return res.status(400).json({
        message: "Wrong action",
      });
    }

    const application = await applicationRepo.findOne({
      where: {
        id: req.body.applicationId,
      },
      relations: {
        project: true,
      },
    });

    if (!application) {
      return res.status(400).json({
        message: "Application not found",
      });
    }

    if (application.project.creatorUserId != req.userId) {
      return res.status(400).json({
        message: "You are not project owner",
      });
    }

    application.status = req.body.action;

    await applicationRepo.save(application);

    res.status(200).json({ success: true });
  } catch (err) {
    console.log(err);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

export const getRecommendedProjects = async (req: Request, res: Response) => {
  try {
    const recommendationsRepo = dataSource.getRepository(Recommendation);

    const recommendations = await recommendationsRepo.find({
      relations: {
        project: {
          user: true,
          categories: true,
        },
      },
      where: {
        userId: req.userId,
      },
    });

    res.status(200).json(
      recommendations
        .map((r) => r.project)
        .map((p) => {
          const { user, ...projectData } = p;
          const userFullName = user.fullName;
          return {
            ...projectData,
            userFullName,
          };
        })
    );
  } catch (err) {
    console.log(err);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

export const getProjectChoices = async (req: Request, res: Response) => {
  try {
    const result = {
      employmentTypes: employmentTypes,
      campuses: campuses,
      projectTypes: projectTypes,
      applicationStatuses: applicationStatuses,
    };

    res.status(200).json(result);
  } catch (err) {
    console.log(err);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};
